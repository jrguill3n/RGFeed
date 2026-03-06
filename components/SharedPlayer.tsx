'use client'

/**
 * SharedPlayer
 *
 * One MuxPlayer instance shared across the entire feed.
 * Positioned fixed, full-screen, behind all feed cells (z-0).
 * Only the active cell's playbackId is loaded; all state switches
 * are prop-driven — no remounts, no per-cell players.
 *
 * Warmup strategy:
 *   - On first user interaction, prime the current playbackId with a
 *     short play→pause→seek(0) sequence to warm up HLS decoding.
 *   - The warmup guard resets when playbackId changes.
 */

import { useEffect, useRef, useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'

type MuxPlayerEl = HTMLElement & {
  play: () => Promise<void>
  pause: () => void
  muted: boolean
  currentTime: number
  readyState: number
}

interface Props {
  /** playbackId of the currently active content item. null when an ad is active. */
  playbackId: string | null
  /** True once the user has tapped — gates audio and warmup. */
  hasInteracted: boolean
  /** Whether the active item is manually paused (tap-to-pause). */
  paused: boolean
  /** Callback: fires when the first decoded frame is ready. */
  onFrameReady: () => void
  /** Callback: fires when frame-ready resets (new playbackId loaded). */
  onFrameReset: () => void
}

export default function SharedPlayer({
  playbackId,
  hasInteracted,
  paused,
  onFrameReady,
  onFrameReset,
}: Props) {
  const playerRef = useRef<MuxPlayerEl>(null)
  const didWarmupRef = useRef(false)
  const warmupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frameReadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstActivationRef = useRef(true)

  // Not used for rendering — kept as internal gate
  const [, setFrameReadyInternal] = useState(false)

  // Reset all guards when playbackId changes
  useEffect(() => {
    didWarmupRef.current = false
    isFirstActivationRef.current = true
    setFrameReadyInternal(false)
    onFrameReset()

    if (frameReadyTimerRef.current) {
      clearTimeout(frameReadyTimerRef.current)
      frameReadyTimerRef.current = null
    }
    if (warmupTimerRef.current) {
      clearTimeout(warmupTimerRef.current)
      warmupTimerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackId])

  // Warmup: play→pause→seek(0) once per playbackId after first interaction
  useEffect(() => {
    const player = playerRef.current
    if (!player || !playbackId || !hasInteracted) return

    const runWarmup = () => {
      if (didWarmupRef.current) return
      didWarmupRef.current = true
      player.muted = true
      player.play().then(() => {
        warmupTimerRef.current = setTimeout(() => {
          player.pause()
          player.currentTime = 0
          warmupTimerRef.current = null
        }, 120)
      }).catch(() => { /* autoplay blocked */ })
    }

    if (player.readyState >= 1) {
      runWarmup()
    } else {
      player.addEventListener('loadedmetadata', runWarmup)
      return () => {
        player.removeEventListener('loadedmetadata', runWarmup)
        if (warmupTimerRef.current) {
          clearTimeout(warmupTimerRef.current)
          warmupTimerRef.current = null
        }
      }
    }
  }, [playbackId, hasInteracted])

  // Frame-ready: fire onFrameReady after a settle delay
  useEffect(() => {
    const player = playerRef.current
    if (!player || !playbackId) return

    const scheduleReady = () => {
      if (frameReadyTimerRef.current) clearTimeout(frameReadyTimerRef.current)
      const delay = isFirstActivationRef.current ? 250 : 150
      isFirstActivationRef.current = false
      frameReadyTimerRef.current = setTimeout(() => {
        frameReadyTimerRef.current = null
        setFrameReadyInternal(true)
        onFrameReady()
      }, delay)
    }

    if (player.readyState >= 2) {
      scheduleReady()
      return () => {
        if (frameReadyTimerRef.current) {
          clearTimeout(frameReadyTimerRef.current)
          frameReadyTimerRef.current = null
        }
      }
    }

    player.addEventListener('loadeddata', scheduleReady)
    player.addEventListener('canplay', scheduleReady)
    return () => {
      player.removeEventListener('loadeddata', scheduleReady)
      player.removeEventListener('canplay', scheduleReady)
      if (frameReadyTimerRef.current) {
        clearTimeout(frameReadyTimerRef.current)
        frameReadyTimerRef.current = null
      }
    }
  }, [playbackId, onFrameReady])

  // Playback control: play/pause/mute based on state
  useEffect(() => {
    const player = playerRef.current
    if (!player || !playbackId) return

    if (!paused) {
      player.muted = !hasInteracted
      player.play().catch(() => {
        player.muted = true
        player.play().catch(() => { /* ignore */ })
      })
    } else {
      player.pause()
    }
  }, [playbackId, paused, hasInteracted])

  // Hidden when no content is active (ad is showing)
  const isVisible = playbackId !== null

  return (
    // @ts-expect-error -- mux-player-react ref typing is incomplete
    <MuxPlayer
      ref={playerRef}
      playbackId={playbackId ?? undefined}
      streamType="on-demand"
      playsInline
      loop
      preload="auto"
      muted
      autoPlay={false}
      preferPlayback="mse"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center center',
        zIndex: 0,
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        opacity: isVisible ? 1 : 0,
        pointerEvents: 'none',
      }}
    />
  )
}
