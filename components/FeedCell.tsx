'use client'

/**
 * FeedCell
 *
 * A single scroll-snap cell that renders ONLY:
 *   - Poster placeholder (hidden once isFrameReady from SharedPlayer)
 *   - UI overlays (metadata, side actions, pause icon, hearts)
 *   - Tap / double-tap interaction layer
 *
 * No MuxPlayer lives here. Playback is delegated entirely to SharedPlayer
 * (for content) and ImaOverlay (for ads), both of which are fixed-position
 * siblings rendered once in SnapFeed.
 */

import { useCallback, useRef, useState } from 'react'
import { FeedItem, AdItem } from '@/lib/feed-data'
import FeedItemPlaceholder from './feed/FeedItemPlaceholder'
import FeedBottomOverlay from './feed/FeedBottomOverlay'
import FeedSideActions from './feed/FeedSideActions'
import HeartAnimation from './feed/HeartAnimation'

interface HeartBurst {
  id: number
  x: number
  y: number
}

// Content cell props
interface ContentCellProps {
  type: 'content'
  item: FeedItem
  index: number
  isActive: boolean
  isFrameReady: boolean
  paused: boolean
  setPaused: (val: boolean) => void
  observerRef: (el: HTMLDivElement | null) => void
}

// Ad cell props — poster/UI only; ImaOverlay handles actual playback
interface AdCellProps {
  type: 'ad'
  ad: AdItem
  index: number
  isActive: boolean
  observerRef: (el: HTMLDivElement | null) => void
}

type Props = ContentCellProps | AdCellProps

export default function FeedCell(props: Props) {
  const { index, isActive, observerRef } = props

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(
    props.type === 'content' ? props.item.likes : 0
  )
  const [hearts, setHearts] = useState<HeartBurst[]>([])
  const [showPauseIcon, setShowPauseIcon] = useState(false)

  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pauseIconTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextHeartId = useRef(0)

  const paused = props.type === 'content' ? props.paused : false
  const setPaused = props.type === 'content' ? props.setPaused : () => {}
  const isFrameReady = props.type === 'content' ? props.isFrameReady : true
  const item = props.type === 'content' ? props.item : null

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tapTimeout.current) {
        // Double-tap: like + heart burst
        clearTimeout(tapTimeout.current)
        tapTimeout.current = null
        if (!liked) {
          setLiked(true)
          setLikeCount((c) => c + 1)
        }
        const rect = e.currentTarget.getBoundingClientRect()
        setHearts((prev) => [
          ...prev,
          { id: nextHeartId.current++, x: e.clientX - rect.left, y: e.clientY - rect.top },
        ])
      } else {
        tapTimeout.current = setTimeout(() => {
          tapTimeout.current = null
          if (isActive && props.type === 'content') {
            const next = !paused
            setPaused(next)
            setShowPauseIcon(true)
            if (pauseIconTimeout.current) clearTimeout(pauseIconTimeout.current)
            pauseIconTimeout.current = setTimeout(() => setShowPauseIcon(false), 800)
          }
        }, 260)
      }
    },
    [liked, isActive, paused, setPaused, props.type]
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

  return (
    <div
      ref={observerRef}
      className="feed-item relative w-full h-dvh overflow-hidden bg-transparent will-change-transform"
      data-index={index}
      data-id={item?.id ?? props.type === 'ad' ? (props as AdCellProps).ad.id : ''}
    >
      {/*
        Poster overlay — visible until SharedPlayer has decoded the first frame
        (isFrameReady). For ad slots, immediately transparent (ImaOverlay covers).
        bg-black base prevents any see-through to SharedPlayer below.
      */}
      {item && (
        <div
          className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
          style={{ opacity: isFrameReady ? 0 : 1 }}
          aria-hidden="true"
        >
          <FeedItemPlaceholder item={item} eager={isActive} />
        </div>
      )}

      {/* Loading ring — shown while active content is buffering */}
      {props.type === 'content' && isActive && !isFrameReady && (
        <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Tap / double-tap interaction layer */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleTap}
        role="button"
        tabIndex={0}
        aria-label={paused ? 'Resume video' : 'Pause video'}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && isActive && props.type === 'content') {
            setPaused(!paused)
          }
        }}
      />

      {/* Pause/play flash indicator */}
      {showPauseIcon && (
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-75 duration-150">
            {paused ? (
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

      {/* Heart bursts */}
      {hearts.map((h) => (
        <HeartAnimation key={h.id} id={h.id} x={h.x} y={h.y} onDone={removeHeart} />
      ))}

      {/* Content UI overlays */}
      {item && (
        <>
          <FeedBottomOverlay item={item} />
          <FeedSideActions item={item} liked={liked} likeCount={likeCount} onLike={handleLike} />
        </>
      )}
    </div>
  )
}
