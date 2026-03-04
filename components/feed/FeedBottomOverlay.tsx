import { Music2 } from 'lucide-react'
import { FeedItem } from '@/lib/feed-data'

interface Props {
  item: FeedItem
}

/**
 * Bottom-left metadata overlay: username, caption, song.
 * The pause indicator is rendered separately in FeedItemView.
 */
export default function FeedBottomOverlay({ item }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-14 z-20 pb-6 px-4 pointer-events-none">
      {/* Gradient scrim */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/85 via-black/40 to-transparent -z-10 pointer-events-none" />

      <div className="flex flex-col gap-1.5">
        {/* Username & handle */}
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm leading-tight drop-shadow">
            {item.username}
          </span>
          <span className="text-white/60 text-xs">{item.handle}</span>
        </div>

        {/* Caption */}
        <p className="text-white text-sm leading-relaxed line-clamp-2 text-pretty drop-shadow">
          {item.caption}
        </p>

        {/* Song info */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <Music2 className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
          <span className="text-white/70 text-xs truncate">{item.song}</span>
        </div>
      </div>
    </div>
  )
}
