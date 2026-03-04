import { FeedItem } from '@/lib/feed-data'

interface Props {
  item: FeedItem
  /** Pass true for the active / preloaded overlay thumbnail to load immediately */
  eager?: boolean
}

export default function FeedItemPlaceholder({ item, eager = false }: Props) {
  const posterUrl = `https://image.mux.com/${item.playbackId}/thumbnail.jpg?width=720&quality=60&fit_mode=smartcrop&time=2`

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl}
        alt={`Thumbnail for ${item.username}'s video`}
        className="absolute inset-0 w-full h-full object-cover"
        loading={eager ? 'eager' : 'lazy'}
        // @ts-expect-error -- fetchpriority is valid HTML but not yet in React types
        fetchpriority={eager ? 'high' : undefined}
      />
      {/* Subtle dark vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none" />
    </div>
  )
}
