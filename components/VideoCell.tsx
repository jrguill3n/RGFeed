'use client'

/**
 * VideoCell
 *
 * A single feed item -- the web equivalent of a FlashList cell in Slop Social.
 *
 * Responsibilities:
 * - Owns all playback control via playerRef (play/pause/mute)
 * - Runs a one-time warmup (play->pause->seek) for preloaded non-active items
 *   to warm up HLS buffering and hardware decoding before activation
 * - Handles tap-to-pause and double-tap-to-like interactions
 * - Renders either MuxPlayer (when shouldPreload) or a poster placeholder
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import { FeedItem } from '@/lib/feed-data'
import FeedItemPlaceholder from './feed/FeedItemPlaceholder'
import FeedBottomOverlay from './feed/FeedBottomOverlay'
import FeedSideActions from './feed/FeedSideActions'
import HeartAnimation from './feed/HeartAnimation'

interface HeartBurst {
  id: number
  x: number
  y: number
}

// Internal type for the mux-player-react element
type MuxPlayerEl = HTMLElement & {
  play: () => Promise<void>
  pause: () => void
  muted: boolean
  currentTime: number
}

interface Props {
  video: {
    id: string
    playbackId: string
    caption?: string
    likes?: number
  }
  // Full FeedItem for overlay display metadata
  item: FeedItem
  index: number
  isActive: boolean
  shouldPreload: boolean
  // paused / setPaused are lifted so SnapFeed can reset on index change
  paused: boolean
  setPaused: (paused: boolean) => void
  hasInteracted: boolean
  // ref callback so SnapFeed's IntersectionObserver can observe this element
  observerRef: (el: HTMLDivElement | null) => void
}

export default function VideoCell({
  item,
  index,
  isActive,
  shouldPreload: preload,
  paused,
  setPaused,
  hasInteracted,
  observerRef,
}: Props) {
  const playerRef = useRef<MuxPlayerEl>(null)
  // Warmup runs at most once per mounted playbackId
  const didWarmupRef = useRef(false)
  // Stores the 120ms warmup pause timeout so we can clear it on unmount
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(item.likes)
  const [hearts, setHearts] = useState<HeartBurst[]>([])
  const [showPauseIcon, setShowPauseIcon] = useState(false)
  // True once loadeddata/canplay fires — controls poster overlay fade-out
  const [isFrameReady, setIsFrameReady] = useState(false)

  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextHeartId = useRef(0)
  const pauseIconTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset warmup guard and frame-ready state when playbackId changes
  useEffect(() => {
    didWarmupRef.current = false
    setIsFrameReady(false)
  }, [item.playbackId])

  // --- Warmup: prime the decoder once metadata is ready for preloaded items ---
  // Translated from Slop Social: source={null} is replaced with conditional mounting,
  // and warmup bridges the thumbnail->first-frame gap by pre-buffering HLS segments.
  useEffect(() => {
    const player = playerRef.current
    // Only run warmup on preloaded non-active items; active items use the playback effect
    if (!player || isActive || !preload) return

    const runWarmup = () => {
      if (didWarmupRef.current) return
      // Gate behind first user interaction to satisfy browser autoplay policy
      if (!hasInteracted) return
      didWarmupRef.current = true

      player.muted = true
      player
        .play()
        .then(() => {
          warmupTimerRef.current = setTimeout(() => {
            player.pause()
            player.currentTime = 0
          }, 120)
        })
        .catch(() => {
          // Warmup blocked by autoplay policy -- decoding will happen lazily
        })
    }

    // If metadata already loaded (readyState >= 1), run warmup immediately
    // readyState: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, etc.
    if ((player as HTMLMediaElement & MuxPlayerEl).readyState >= 1) {
      runWarmup()
    } else {
      player.addEventListener('loadedmetadata', runWarmup)
    }

    return () => {
      player.removeEventListener('loadedmetadata', runWarmup)
      // Clear the 120ms pause timer on cleanup to avoid acting on unmounted player
      if (warmupTimerRef.current) {
        clearTimeout(warmupTimerRef.current)
        warmupTimerRef.current = null
      }
    }
  }, [item.playbackId, isActive, preload, hasInteracted])

  // --- First frame ready: listen for loadeddata / canplay to hide poster overlay ---
  useEffect(() => {
    const player = playerRef.current
    if (!player || !preload) return

    const onReady = () => setIsFrameReady(true)

    // If already past HAVE_CURRENT_DATA (readyState >= 2), frame is ready now
    if ((player as HTMLMediaElement & MuxPlayerEl).readyState >= 2) {
      setIsFrameReady(true)
      return
    }

    player.addEventListener('loadeddata', onReady)
    player.addEventListener('canplay', onReady)
    return () => {
      player.removeEventListener('loadeddata', onReady)
      player.removeEventListener('canplay', onReady)
    }
  }, [item.playbackId, preload])

  // --- Playback control: active vs preloaded ---
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    if (isActive && !paused) {
      player.muted = !hasInteracted
      player.play().catch(() => {
        // Muted fallback if unmuted autoplay is blocked
        player.muted = true
        player.play().catch(() => { /* ignore */ })
      })
    } else {
      player.pause()
      if (!isActive) player.muted = true
    }
  }, [isActive, paused, hasInteracted])

  // --- Tap / double-tap ---
  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tapTimeout.current) {
        // Second tap within 260ms -> double-tap: like + heart burst
        clearTimeout(tapTimeout.current)
        tapTimeout.current = null

        if (!liked) {
          setLiked(true)
          setLikeCount((c) => c + 1)
        }

        const rect = e.currentTarget.getBoundingClientRect()
        setHearts((prev) => [
          ...prev,
          {
            id: nextHeartId.current++,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          },
        ])
      } else {
        tapTimeout.current = setTimeout(() => {
          tapTimeout.current = null
          if (isActive) {
            const next = !paused
            setPaused(next)
            setShowPauseIcon(true)
            if (pauseIconTimeout.current) clearTimeout(pauseIconTimeout.current)
            pauseIconTimeout.current = setTimeout(() => setShowPauseIcon(false), 800)
          }
        }, 260)
      }
    },
    [liked, isActive, paused, setPaused]
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
      className="feed-item relative w-full h-dvh overflow-hidden bg-black"
      data-id={item.id}
      data-index={index}
    >
      {/* Video player or lightweight poster placeholder */}
      {preload ? (
        <>
          {/* @ts-expect-error -- mux-player-react ref typing is incomplete */}
          <MuxPlayer
            ref={playerRef}
            playbackId={item.playbackId}
            streamType="on-demand"
            playsInline
            loop
            preload="auto"
            muted
            autoPlay={false}
            className="absolute inset-0 w-full h-full"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Poster overlay sits above MuxPlayer until first decoded frame is ready.
              eager=true so the browser fetches the thumbnail at high priority
              immediately, preventing any black gap before the video is ready.
              Fades out once isFrameReady is true. */}
          <div
            className="absolute inset-0 z-[5] transition-opacity duration-300 pointer-events-none"
            style={{ opacity: isFrameReady ? 0 : 1 }}
            aria-hidden="true"
          >
            <FeedItemPlaceholder item={item} eager />
          </div>
        </>
      ) : (
        <FeedItemPlaceholder item={item} eager={false} />
      )}

      {/* Tap / double-tap interaction layer */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={handleTap}
        role="button"
        tabIndex={0}
        aria-label={paused ? 'Resume video' : 'Pause video'}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && isActive) {
            setPaused(!paused)
          }
        }}
      />

      {/* Centered pause/play flash indicator */}
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

      {/* Heart burst animations from double-tap */}
      {hearts.map((h) => (
        <HeartAnimation key={h.id} id={h.id} x={h.x} y={h.y} onDone={removeHeart} />
      ))}

      <FeedBottomOverlay item={item} />
      <FeedSideActions item={item} liked={liked} likeCount={likeCount} onLike={handleLike} />
    </div>
  )
}
