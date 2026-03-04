import { Music2 } from 'lucide-react'
import { FeedItem } from '@/lib/feed-data'

interface Props {
  item: FeedItem
  isPaused: boolean
}

export default function FeedBottomOverlay({ item, isPaused }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-14 z-20 pb-6 px-4 pointer-events-none">
      {/* Gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent -z-10 pointer-events-none" />

      {/* Pause indicator */}
      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Username & handle */}
        <div className="flex items-center gap-2">
          <span className="text-foreground font-bold text-base leading-tight">
            {item.username}
          </span>
          <span className="text-muted-foreground text-sm">{item.handle}</span>
        </div>

        {/* Description */}
        <p className="text-foreground text-sm leading-relaxed line-clamp-2 text-pretty">
          {item.description}
        </p>

        {/* Song info */}
        <div className="flex items-center gap-2 mt-1">
          <Music2 className="w-3.5 h-3.5 text-foreground/80 flex-shrink-0" />
          <span className="text-foreground/80 text-xs truncate">{item.song}</span>
        </div>
      </div>
    </div>
  )
}
