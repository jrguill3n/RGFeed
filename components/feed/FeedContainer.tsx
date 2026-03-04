'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { FEED_ITEMS } from '@/lib/feed-data'
import FeedItemView from './FeedItemView'

const PRELOAD_AHEAD = 5   // items to preload in scroll direction
const PRELOAD_BEHIND = 1  // items to preload behind active
const OBSERVE_THRESHOLD = 0.6

export default function FeedContainer() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrollDir, setScrollDir] = useState<'down' | 'up'>('down')

  // Track scroll direction via scrollTop delta
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTopRef = useRef(0)

  // Intersection observer refs — one per item
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const itemRefs = useRef<(HTMLDivElement | null)[]>(Array.from({ length: FEED_ITEMS.length }, () => null))
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Compute preload window based on direction
  const isInPreloadWindow = useCallback(
    (index: number): boolean => {
      if (scrollDir === 'down') {
        return index >= currentIndex - PRELOAD_BEHIND && index <= currentIndex + PRELOAD_AHEAD
      } else {
        return index >= currentIndex - PRELOAD_AHEAD && index <= currentIndex + PRELOAD_BEHIND
      }
    },
    [currentIndex, scrollDir]
  )

  // Set up IntersectionObserver
  useEffect(() => {
    observerRef.current?.disconnect()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLDivElement
            const id = el.dataset.id
            const idx = FEED_ITEMS.findIndex((item) => item.id === id)
            if (idx !== -1) {
              setCurrentIndex(idx)
            }
          }
        })
      },
      { threshold: OBSERVE_THRESHOLD }
    )

    itemRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el)
    })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  // Track scroll direction
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const st = container.scrollTop
      if (st > lastScrollTopRef.current) {
        setScrollDir('down')
      } else if (st < lastScrollTopRef.current) {
        setScrollDir('up')
      }
      lastScrollTopRef.current = st
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

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
    >
      {FEED_ITEMS.map((item, index) => (
        <FeedItemView
          key={item.id}
          item={item}
          isActive={index === currentIndex}
          isPreloaded={isInPreloadWindow(index)}
          observerRef={setItemRef(index)}
        />
      ))}
    </div>
  )
}
