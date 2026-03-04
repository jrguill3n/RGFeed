'use client'

import { useEffect, useRef } from 'react'
import MuxPlayer from '@mux/mux-player-react'

interface Props {
  playbackId: string
  /** True only for the single active item that should be playing */
  isActive: boolean
}

type MuxPlayerEl = HTMLElement & {
  play: () => Promise<void>
  pause: () => void
  muted: boolean
  currentTime: number
}

export default function FeedVideoPlayer({ playbackId, isActive }: Props) {
  const playerRef = useRef<MuxPlayerEl>(null)

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    if (isActive) {
      player.muted = false
      player.play().catch(() => {
        // Autoplay blocked — fall back to muted autoplay
        player.muted = true
        player.play().catch(() => { /* ignore */ })
      })
    } else {
      player.pause()
      player.muted = true
    }
  }, [isActive])

  return (
    // @ts-expect-error — mux-player-react ref typing doesn't fully match HTMLElement
    <MuxPlayer
      ref={playerRef}
      playbackId={playbackId}
      streamType="on-demand"
      playsInline
      loop
      preload="auto"
      // Start muted; the useEffect above unmutes for the active item
      muted
      autoPlay={false}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
