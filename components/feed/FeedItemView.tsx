'use client'

import { useCallback, useRef, useState } from 'react'
import { FeedItem } from '@/lib/feed-data'
import FeedVideoPlayer from './FeedVideoPlayer'
import FeedItemPlaceholder from './FeedItemPlaceholder'
import FeedBottomOverlay from './FeedBottomOverlay'
import FeedSideActions from './FeedSideActions'
import HeartAnimation from './HeartAnimation'

interface HeartBurst {
  id: number
  x: number
  y: number
}

interface Props {
  item: FeedItem
  isActive: boolean
  isPreloaded: boolean
  observerRef: (el: HTMLDivElement | null) => void
}

export default function FeedItemView({ item, isActive, isPreloaded, observerRef }: Props) {
  const [isPaused, setIsPaused] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likes)
  const [hearts, setHearts] = useState<HeartBurst[]>([])

  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextHeartId = useRef(0)

  // Tap to pause/play — using single/double click distinction
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (tapTimeout.current) {
      // Double-tap detected — clear the pending single tap
      clearTimeout(tapTimeout.current)
      tapTimeout.current = null

      // Double-tap: like + heart burst
      if (!liked) {
        setLiked(true)
        setLikeCount((c) => c + 1)
      }

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      setHearts((prev) => [
        ...prev,
        { id: nextHeartId.current++, x, y },
      ])
    } else {
      // Potential single tap — wait to see if a second tap comes
      tapTimeout.current = setTimeout(() => {
        tapTimeout.current = null
        if (isActive) {
          setIsPaused((p) => !p)
        }
      }, 260)
    }
  }, [liked, isActive])

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const handleLike = useCallback(() => {
    setLiked((prev) => {
      if (!prev) setLikeCount((c) => c + 1)
      else setLikeCount((c) => c - 1)
      return !prev
    })
  }, [])

  return (
    <div
      ref={observerRef}
      className="feed-item relative w-full overflow-hidden bg-black"
      data-id={item.id}
    >
      {/* Video or placeholder */}
      {isPreloaded ? (
        <FeedVideoPlayer
          playbackId={item.playbackId}
          isActive={isActive && !isPaused}
        />
      ) : (
        <FeedItemPlaceholder item={item} />
      )}

      {/* Tap / double-tap interaction layer */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleTap}
        role="button"
        tabIndex={0}
        aria-label={isPaused ? 'Resume video' : 'Pause video'}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') setIsPaused((p) => !p)
        }}
      />

      {/* Heart burst animations */}
      {hearts.map((h) => (
        <HeartAnimation key={h.id} id={h.id} x={h.x} y={h.y} onDone={removeHeart} />
      ))}

      {/* Bottom info overlay */}
      <FeedBottomOverlay item={item} isPaused={isPaused && isActive} />

      {/* Side action buttons */}
      <FeedSideActions
        item={item}
        liked={liked}
        likeCount={likeCount}
        onLike={handleLike}
      />
    </div>
  )
}
