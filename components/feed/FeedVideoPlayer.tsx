'use client'

import { useEffect, useRef } from 'react'
import MuxPlayer from '@mux/mux-player-react'

interface Props {
  playbackId: string
  isActive: boolean
  isMuted?: boolean
}

export default function FeedVideoPlayer({ playbackId, isActive, isMuted = false }: Props) {
  const playerRef = useRef<HTMLElement & {
    play: () => Promise<void>
    pause: () => void
    muted: boolean
    currentTime: number
  }>(null)

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    player.muted = isMuted || !isActive

    if (isActive) {
      player.muted = false
      player.currentTime = 0
      player.play().catch(() => {
        // Autoplay blocked — mute and retry
        player.muted = true
        player.play().catch(() => {/* ignore */})
      })
    } else {
      player.pause()
      player.muted = true
    }
  }, [isActive, isMuted])

  return (
    <MuxPlayer
      // @ts-expect-error — ref typing mismatch with mux-player-react
      ref={playerRef}
      playbackId={playbackId}
      streamType="on-demand"
      autoPlay={false}
      loop
      muted
      playsInline
      preload="auto"
      style={{ width: '100%', height: '100%' }}
    />
  )
}
