'use client'

/**
 * SnapFeed
 *
 * Composes the full feed from three fixed-position shared layers
 * and a list of lightweight FeedCell scroll-snap items.
 *
 * Layer architecture:
 *   z-0  SharedPlayer  — one MuxPlayer, fixed, full-screen, playbackId-switched
 *   z-2  ImaOverlay    — one IMA container, fixed, shown only for ad slots
 *   z-3+ FeedCell list — poster + UI overlays only, transparent bg
 *
 * This mirrors the Slop Social principle: only one active playback pipeline
 * at any time. Switching videos = updating a prop, not remounting a player.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { buildFeedItems, FeedSlot, interlaceAds, MuxVideo, AdItem } from '@/lib/feed-data'
import SharedPlayer from './SharedPlayer'
import ImaOverlay from './ImaOverlay'
import FeedCell from './FeedCell'

const OBSERVE_THRESHOLD = 0.6

export default function SnapFeed() {
  const [feedItems, setFeedItems] = useState<FeedSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [pausedMap, setPausedMap] = useState<Record<number, boolean>>({})
  // Lifted from SharedPlayer so FeedCell can show/hide the poster overlay
  const [isFrameReady, setIsFrameReady] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTopRef = useRef(0)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const observerRef = useRef<IntersectionObserver | null>(null)

  // --- Fetch feed on mount ---
  useEffect(() => {
    async function loadFeed() {
      try {
        const res = await fetch('/api/mux/assets')
        if (!res.ok) {
          const json = await res.json().catch(() => ({}))
          throw new Error(json.error ?? `API error ${res.status}`)
        }
        const json: { videos: MuxVideo[] } = await res.json()
        setFeedItems(interlaceAds(buildFeedItems(json.videos), 4))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feed.')
      } finally {
        setLoading(false)
      }
    }
    loadFeed()
  }, [])

  // Keep itemRefs sized correctly
  useEffect(() => {
    itemRefs.current = Array.from(
      { length: feedItems.length },
      (_, i) => itemRefs.current[i] ?? null
    )
  }, [feedItems.length])

  // Reset paused + frame-ready when active index changes
  useEffect(() => {
    setPausedMap((prev) => ({ ...prev, [currentIndex]: false }))
    setIsFrameReady(false)
  }, [currentIndex])

  // Scroll direction tracking
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const onScroll = () => {
      const st = container.scrollTop
      lastScrollTopRef.current = st
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [])

  // IntersectionObserver
  useEffect(() => {
    if (feedItems.length === 0) return
    observerRef.current?.disconnect()

    const ratioMap = new Map<number, number>()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.index)
          if (!isNaN(idx)) ratioMap.set(idx, entry.intersectionRatio)
        })
        let bestIdx = -1
        let bestRatio = OBSERVE_THRESHOLD - 0.001
        ratioMap.forEach((ratio, idx) => {
          if (ratio > bestRatio) { bestRatio = ratio; bestIdx = idx }
        })
        if (bestIdx !== -1) setCurrentIndex(bestIdx)
      },
      { threshold: OBSERVE_THRESHOLD }
    )
    itemRefs.current.forEach((el) => { if (el) observerRef.current?.observe(el) })
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

  const makeSetPaused = useCallback(
    (index: number) => (val: boolean) =>
      setPausedMap((prev) => ({ ...prev, [index]: val })),
    []
  )

  // Derive current active slot
  const activeSlot = feedItems[currentIndex] ?? null
  const activeContentPlaybackId =
    activeSlot?.type === 'content' ? activeSlot.playbackId : null
  const activeAd: AdItem | null =
    activeSlot?.type === 'ad' ? activeSlot : null

  // --- States ---
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
    <>
      {/* Layer 0: one shared video player, fixed full-screen, behind everything */}
      <SharedPlayer
        playbackId={activeContentPlaybackId}
        hasInteracted={hasInteracted}
        paused={pausedMap[currentIndex] ?? false}
        onFrameReady={() => setIsFrameReady(true)}
        onFrameReset={() => setIsFrameReady(false)}
      />

      {/* Layer 2: one IMA overlay, fixed full-screen, shown only for ad slots */}
      <ImaOverlay activeAd={activeAd} hasInteracted={hasInteracted} />

      {/* Scroll-snap list: FeedCells are poster + UI only, no players */}
      <div
        ref={scrollContainerRef}
        className="feed-scroll relative w-full"
        style={{ zIndex: 3 }}
        aria-label="Video feed"
        onPointerDown={handleFirstInteraction}
      >
        {feedItems.map((slot, index) => {
          const isActive = index === currentIndex

          if (slot.type === 'ad') {
            return (
              <FeedCell
                key={slot.id}
                type="ad"
                ad={slot}
                index={index}
                isActive={isActive}
                observerRef={setItemRef(index)}
              />
            )
          }

          return (
            <FeedCell
              key={slot.id}
              type="content"
              item={slot}
              index={index}
              isActive={isActive}
              isFrameReady={isActive ? isFrameReady : true}
              paused={pausedMap[index] ?? false}
              setPaused={makeSetPaused(index)}
              observerRef={setItemRef(index)}
            />
          )
        })}
      </div>
    </>
  )
}
