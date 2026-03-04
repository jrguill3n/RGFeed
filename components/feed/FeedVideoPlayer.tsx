'use client'

import { useEffect, useRef } from 'react'
import MuxPlayer from '@mux/mux-player-react'

interface Props {
  playbackId: string
  isActive: boolean
  hasInteracted: boolean
}

type MuxPlayerEl = HTMLElement & {
  play: () => Promise<void>
  pause: () => void
  muted: boolean
  currentTime: number
}

export default function FeedVideoPlayer({ playbackId, isActive, hasInteracted }: Props) {
  const playerRef = useRef<MuxPlayerEl>(null)
  // Guard: warmup runs at most once per mounted playbackId
  const didWarmupRef = useRef(false)

  // Reset warmup guard whenever the playbackId changes
  useEffect(() => {
    didWarmupRef.current = false
  }, [playbackId])

  // --- Warmup: prime the decoder once metadata is ready for preloaded items ---
  useEffect(() => {
    const player = playerRef.current
    if (!player || isActive) return // active items are handled by the playback effect

    const runWarmup = () => {
      if (didWarmupRef.current) return
      didWarmupRef.current = true

      // Ensure muted before touching play (preloaded items must never unmute)
      player.muted = true
      player.play().then(() => {
        const timer = setTimeout(() => {
          player.pause()
          player.currentTime = 0
        }, 120)
        // Cleanup if the component unmounts before the timer fires
        return () => clearTimeout(timer)
      }).catch(() => {
        // Warmup play blocked — no-op, decode will happen lazily
      })
    }

    player.addEventListener('loadedmetadata', runWarmup)
    return () => player.removeEventListener('loadedmetadata', runWarmup)
  }, [playbackId, isActive])

  // --- Playback control: active vs preloaded ---
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    if (isActive) {
      player.muted = !hasInteracted
      player.play().catch(() => {
        player.muted = true
        player.play().catch(() => { /* ignore */ })
      })
    } else {
      player.pause()
      player.muted = true
    }
  }, [isActive, hasInteracted])

  return (
    // @ts-expect-error — mux-player-react ref typing doesn't fully match HTMLElement
    <MuxPlayer
      ref={playerRef}
      playbackId={playbackId}
      streamType="on-demand"
      playsInline
      loop
      preload="auto"
      muted
      autoPlay={false}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
