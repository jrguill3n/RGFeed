'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FEED_ITEMS } from '@/lib/feed-data'
import FeedItemView from './FeedItemView'

// Directional preload window sizes (matching Slop Social spec)
const MAX_AHEAD = 5
const MAX_BEHIND = 1
const OBSERVE_THRESHOLD = 0.6

export default function FeedContainer() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down')
  // Track whether the user has interacted — gates audio unmute
  const [hasInteracted, setHasInteracted] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTopRef = useRef(0)
  const itemRefs = useRef<(HTMLDivElement | null)[]>(
    Array.from({ length: FEED_ITEMS.length }, () => null)
  )
  const observerRef = useRef<IntersectionObserver | null>(null)

  // --- Scroll direction tracking ---
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const st = container.scrollTop
      if (st > lastScrollTopRef.current) {
        setScrollDirection('down')
      } else if (st < lastScrollTopRef.current) {
        setScrollDirection('up')
      }
      lastScrollTopRef.current = st
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // --- IntersectionObserver — pick the most visible item (>= threshold) ---
  useEffect(() => {
    observerRef.current?.disconnect()

    // Keep a visibility ratio map so we can pick the most visible item
    const ratioMap = new Map<number, number>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLDivElement
          const idx = Number(el.dataset.index)
          if (!isNaN(idx)) {
            ratioMap.set(idx, entry.intersectionRatio)
          }
        })

        // Find the item with the highest visibility that meets the threshold
        let bestIdx = -1
        let bestRatio = OBSERVE_THRESHOLD - 0.001
        ratioMap.forEach((ratio, idx) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestIdx = idx
          }
        })

        if (bestIdx !== -1) {
          setCurrentIndex(bestIdx)
        }
      },
      { threshold: OBSERVE_THRESHOLD }
    )

    itemRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  // --- Directional shouldPreload ---
  // distance = index - currentIndex
  // "ahead" in scroll direction:
  //   scrollDirection "down" → distance > 0 is ahead
  //   scrollDirection "up"   → distance < 0 is ahead
  const shouldPreload = useCallback(
    (index: number): boolean => {
      if (index === currentIndex) return true
      const distance = index - currentIndex
      const isAhead =
        scrollDirection === 'down' ? distance > 0 : distance < 0
      const absDist = Math.abs(distance)
      if (isAhead) return absDist <= MAX_AHEAD
      return absDist <= MAX_BEHIND
    },
    [currentIndex, scrollDirection]
  )

  // --- First-interaction handler — set on the container so any click counts ---
  const handleFirstInteraction = useCallback(() => {
    if (!hasInteracted) setHasInteracted(true)
  }, [hasInteracted])

  const setItemRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      itemRefs.current[index] = el
      if (el && observerRef.current) {
        observerRef.current.observe(el)
      }
    },
    []
  )

  return (
    <div
      ref={scrollContainerRef}
      className="feed-scroll w-full"
      aria-label="Video feed"
      // Capture first interaction at the container level
      onClick={handleFirstInteraction}
    >
      {FEED_ITEMS.map((item, index) => (
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
