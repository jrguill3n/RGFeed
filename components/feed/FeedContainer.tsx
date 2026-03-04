'use client'

/**
 * FeedContainer — client-side feed shell.
 *
 * Web translation of Slop Social's feed architecture:
 * - On mount, fetches /api/mux/assets which pulls public playback IDs from Mux
 * - Applies scroll-snap + IntersectionObserver to track currentIndex
 * - Applies directional preloading: 5 items ahead, 1 item behind in scroll direction
 * - Only the active item plays audio; preloaded items are muted and paused
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { buildFeedItems, FeedItem, MuxVideo } from '@/lib/feed-data'
import FeedItemView from './FeedItemView'

// Directional preload window sizes (web POC optimization: 6 ahead, 1 behind)
const MAX_AHEAD = 6
const MAX_BEHIND = 1
const OBSERVE_THRESHOLD = 0.6

export default function FeedContainer() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down')
  const [hasInteracted, setHasInteracted] = useState(false)

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
    itemRefs.current = Array.from({ length: feedItems.length }, (_, i) =>
      itemRefs.current[i] ?? null
    )
  }, [feedItems.length])

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

  // --- IntersectionObserver — picks the most visible item >= threshold ---
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

  // --- Directional shouldPreload ---
  // distance = index - currentIndex
  // "ahead" in scroll direction:
  //   "down" → positive distance is ahead
  //   "up"   → negative distance is ahead
  const shouldPreload = useCallback(
    (index: number): boolean => {
      if (index === currentIndex) return true
      const distance = index - currentIndex
      const isAhead =
        scrollDirection === 'down' ? distance > 0 : distance < 0
      const absDist = Math.abs(distance)
      return isAhead ? absDist <= MAX_AHEAD : absDist <= MAX_BEHIND
    },
    [currentIndex, scrollDirection]
  )

  const handleFirstInteraction = useCallback(() => {
    if (!hasInteracted) setHasInteracted(true)
  }, [hasInteracted])

  const setItemRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      itemRefs.current[index] = el
      if (el && observerRef.current) observerRef.current.observe(el)
    },
    []
  )

  const preloadIndices = feedItems.map((_, i) => i).filter(shouldPreload)

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
          onClick={() => { setError(null); setLoading(true); window.location.reload() }}
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
          Upload videos to your Mux account to see them here.
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
      {/* Debug overlay */}
      <div className="fixed top-3 left-3 z-50 pointer-events-none font-mono text-[11px] leading-5 bg-black/70 text-green-400 border border-green-500/40 rounded-md px-3 py-2 space-y-0.5 backdrop-blur-sm">
        <div>
          <span className="text-green-600">currentIndex</span>
          {' '}{currentIndex}
        </div>
        <div>
          <span className="text-green-600">scrollDirection</span>
          {' '}{scrollDirection}
        </div>
        <div>
          <span className="text-green-600">preloaded</span>
          {' '}{preloadIndices.length} items [{preloadIndices.join(', ')}]
        </div>
        <div>
          <span className="text-green-600">hasInteracted</span>
          {' '}{String(hasInteracted)}
        </div>
      </div>

      {feedItems.map((item, index) => (
        <FeedItemView
          key={item.id}
          item={item}
          index={index}
          isActive={index === currentIndex}
          shouldPreload={shouldPreload(index)}
          hasInteracted={hasInteracted}
          onFirstInteraction={handleFirstInteraction}
          observerRef={setItemRef(index)}
        />
      ))}
    </div>
  )
}
