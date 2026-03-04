'use client'

/**
 * SnapFeed
 *
 * The scroll-snap feed container -- web equivalent of FlashList in Slop Social.
 *
 * Responsibilities:
 * - Full-screen scroll-snap container (CSS scroll-snap-type: y mandatory)
 * - IntersectionObserver (threshold 0.6) to detect currentIndex
 * - scrollTop delta tracking for scrollDirection ("down" | "up")
 * - hasInteracted state (gates audio and warmup behind first user gesture)
 * - Fetches video list from /api/mux/assets on mount
 * - Renders VideoCell for each item with preload window from lib/preloadWindow
 * - paused state per item, reset to false when currentIndex changes
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { buildFeedItems, FeedItem, MuxVideo } from '@/lib/feed-data'
import { shouldPreload as computeShouldPreload } from '@/lib/preloadWindow'
import VideoCell from './VideoCell'

const OBSERVE_THRESHOLD = 0.6

export default function SnapFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down')
  const [hasInteracted, setHasInteracted] = useState(false)

  // paused state per item -- only the active item's paused flag matters for playback
  const [pausedMap, setPausedMap] = useState<Record<number, boolean>>({})

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTopRef = useRef(0)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)

  // --- Fetch real Mux assets on mount ---
  useEffect(() => {
    async function loadFeed() {
      try {
        const res = await fetch('/api/mux/assets')
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? `API error ${res.status}`)
        }
        const json: { videos: MuxVideo[] } = await res.json()
        setFeedItems(buildFeedItems(json.videos))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed.')
      } finally {
        setLoading(false)
      }
    }
    loadFeed()
  }, [])

  // Keep itemRefs array sized correctly when feedItems changes
  useEffect(() => {
    itemRefs.current = Array.from(
      { length: feedItems.length },
      (_, i) => itemRefs.current[i] ?? null
    )
  }, [feedItems.length])

  // Reset the active item's paused state whenever currentIndex changes
  useEffect(() => {
    setPausedMap((prev) => ({ ...prev, [currentIndex]: false }))
  }, [currentIndex])

  // --- Scroll direction tracking ---
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const st = container.scrollTop
      if (st > lastScrollTopRef.current) setScrollDirection('down')
      else if (st < lastScrollTopRef.current) setScrollDirection('up')
      lastScrollTopRef.current = st
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // --- IntersectionObserver: picks the most visible item >= threshold ---
  useEffect(() => {
    if (feedItems.length === 0) return
    observerRef.current?.disconnect()

    const ratioMap = new Map<number, number>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLDivElement).dataset.index)
          if (!isNaN(idx)) ratioMap.set(idx, entry.intersectionRatio)
        })
        let bestIdx = -1
        let bestRatio = OBSERVE_THRESHOLD - 0.001
        ratioMap.forEach((ratio, idx) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestIdx = idx
          }
        })
        if (bestIdx !== -1) setCurrentIndex(bestIdx)
      },
      { threshold: OBSERVE_THRESHOLD }
    )

    itemRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [feedItems.length])

  const handleFirstInteraction = useCallback(() => {
    setHasInteracted(true)
  }, [])

  const setItemRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      itemRefs.current[index] = el
      if (el && observerRef.current) observerRef.current.observe(el)
    },
    []
  )

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-foreground" />
        <p className="font-sans text-sm font-semibold tracking-widest uppercase text-muted-foreground">
          Loading feed...
        </p>
      </div>
    )
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-2xl font-black tracking-tight text-foreground">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-md bg-foreground px-5 py-2 text-sm font-bold text-background hover:opacity-80 transition-opacity"
        >
          Retry
        </button>
      </div>
    )
  }

  // --- Empty state ---
  if (feedItems.length === 0) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-2xl font-black tracking-tight text-foreground">No videos yet</p>
        <p className="text-sm text-muted-foreground">
          Upload videos with a public playback policy to your Mux account to see them here.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollContainerRef}
      className="feed-scroll w-full"
      aria-label="Video feed"
      onClick={handleFirstInteraction}
    >
      {feedItems.map((item, index) => {
        const preload = computeShouldPreload(index, currentIndex, scrollDirection)
        const paused = pausedMap[index] ?? false
        return (
          <VideoCell
            key={item.id}
            video={{ id: item.id, playbackId: item.playbackId }}
            item={item}
            index={index}
            isActive={index === currentIndex}
            shouldPreload={preload}
            paused={paused}
            setPaused={(val) =>
              setPausedMap((prev) => ({ ...prev, [index]: val }))
            }
            hasInteracted={hasInteracted}
            observerRef={setItemRef(index)}
          />
        )
      })}
    </div>
  )
}
