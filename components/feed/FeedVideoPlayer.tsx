'use client'

import { useEffect, useRef } from 'react'
import MuxPlayer from '@mux/mux-player-react'

interface Props {
  playbackId: string
  /**
   * True only when this item is the active feed item AND not manually paused.
   * Preloaded-but-inactive items receive isActive=false.
   */
  isActive: boolean
  /**
   * True after the user has clicked anywhere in the feed for the first time.
   * Required to unmute audio (browser autoplay policy).
   */
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

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    if (isActive) {
      // Only unmute when the user has already interacted (browser autoplay policy)
      player.muted = !hasInteracted
      player.play().catch(() => {
        // If play fails (autoplay blocked), fall back to muted play
        player.muted = true
        player.play().catch(() => { /* ignore */ })
      })
    } else {
      // Preloaded-but-inactive: pause and keep muted
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
      // Always start muted; useEffect above handles unmuting after user gesture
      muted
      autoPlay={false}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
