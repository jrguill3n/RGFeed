'use client'

import { Heart, MessageCircle, Share2, Bookmark, Music2 } from 'lucide-react'
import { formatCount, FeedItem } from '@/lib/feed-data'
import { cn } from '@/lib/utils'

interface Props {
  item: FeedItem
  liked: boolean
  likeCount: number
  onLike: () => void
}

export default function FeedSideActions({ item, liked, likeCount, onLike }: Props) {
  return (
    <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
      {/* Avatar */}
      <div className="relative">
        <div className="w-11 h-11 rounded-full border-2 border-foreground overflow-hidden bg-secondary">
          {/* Placeholder avatar generated from username initial */}
          <div className="w-full h-full flex items-center justify-center bg-secondary text-foreground font-bold text-lg select-none">
            {item.username.charAt(0)}
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
          <span className="text-accent-foreground text-xs font-bold leading-none">+</span>
        </div>
      </div>

      {/* Like */}
      <button
        className="flex flex-col items-center gap-1 group"
        onClick={onLike}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        <div className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90',
          liked && 'like-pop'
        )}>
          <Heart
            className={cn(
              'w-7 h-7 transition-colors',
              liked ? 'fill-accent stroke-accent' : 'fill-white/20 stroke-foreground'
            )}
          />
        </div>
        <span className="text-foreground text-xs font-semibold tabular-nums drop-shadow">
          {formatCount(likeCount)}
        </span>
      </button>

      {/* Comments */}
      <button
        className="flex flex-col items-center gap-1"
        aria-label="Comments"
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center">
          <MessageCircle className="w-7 h-7 fill-white/20 stroke-foreground" />
        </div>
        <span className="text-foreground text-xs font-semibold tabular-nums drop-shadow">
          {formatCount(item.comments)}
        </span>
      </button>

      {/* Bookmark */}
      <button
        className="flex flex-col items-center gap-1"
        aria-label="Bookmark"
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center">
          <Bookmark className="w-7 h-7 fill-white/20 stroke-foreground" />
        </div>
        <span className="text-foreground text-xs font-semibold tabular-nums drop-shadow">
          {formatCount(item.shares)}
        </span>
      </button>

      {/* Share */}
      <button
        className="flex flex-col items-center gap-1"
        aria-label="Share"
      >
        <div className="w-11 h-11 rounded-full flex items-center justify-center">
          <Share2 className="w-6 h-6 stroke-foreground" />
        </div>
        <span className="text-foreground text-xs font-semibold drop-shadow">Share</span>
      </button>

      {/* Spinning vinyl */}
      <div className="w-10 h-10 rounded-full border-2 border-foreground/40 bg-secondary flex items-center justify-center animate-spin [animation-duration:4s]">
        <Music2 className="w-4 h-4 text-foreground" />
      </div>
    </div>
  )
}
