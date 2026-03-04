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
  const [showPauseIcon, setShowPauseIcon] = useState(false)

  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextHeartId = useRef(0)
  const pauseIconTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tapTimeout.current) {
        // Second tap within 260 ms → double-tap: like + heart burst
        clearTimeout(tapTimeout.current)
        tapTimeout.current = null

        if (!liked) {
          setLiked(true)
          setLikeCount((c) => c + 1)
        }

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        setHearts((prev) => [...prev, { id: nextHeartId.current++, x, y }])
      } else {
        // First tap — wait to distinguish from double-tap
        tapTimeout.current = setTimeout(() => {
          tapTimeout.current = null
          if (isActive) {
            setIsPaused((p) => {
              const next = !p
              // Flash the pause/play icon for 800 ms
              setShowPauseIcon(true)
              if (pauseIconTimeout.current) clearTimeout(pauseIconTimeout.current)
              pauseIconTimeout.current = setTimeout(() => setShowPauseIcon(false), 800)
              return next
            })
          }
        }, 260)
      }
    },
    [liked, isActive]
  )

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const handleLike = useCallback(() => {
    setLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1))
      return !prev
    })
  }, [])

  // Active item plays; paused item stops; preloaded but inactive items stay muted/paused
  const playerIsActive = isActive && !isPaused

  return (
    <div
      ref={observerRef}
      className="feed-item relative w-full overflow-hidden bg-black"
      data-id={item.id}
    >
      {/* Video or lightweight placeholder */}
      {isPreloaded ? (
        <FeedVideoPlayer playbackId={item.playbackId} isActive={playerIsActive} />
      ) : (
        <FeedItemPlaceholder item={item} />
      )}

      {/* Tap / double-tap interaction layer (sits above video, below overlays) */}
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

      {/* Centered pause/play flash indicator */}
      {showPauseIcon && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-75 duration-150">
            {isPaused ? (
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white ml-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Heart burst animations from double-tap */}
      {hearts.map((h) => (
        <HeartAnimation key={h.id} id={h.id} x={h.x} y={h.y} onDone={removeHeart} />
      ))}

      {/* Bottom metadata overlay */}
      <FeedBottomOverlay item={item} />

      {/* Right-side action buttons */}
      <FeedSideActions
        item={item}
        liked={liked}
        likeCount={likeCount}
        onLike={handleLike}
      />
    </div>
  )
}
