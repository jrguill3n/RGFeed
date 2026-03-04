import { FeedItem } from '@/lib/feed-data'

interface Props {
  item: FeedItem
}

export default function FeedItemPlaceholder({ item }: Props) {
  const posterUrl = `https://image.mux.com/${item.playbackId}/thumbnail.jpg?width=720&fit_mode=smartcrop&time=2`

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Poster image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl}
        alt={`Thumbnail for ${item.username}'s video`}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      {/* Subtle dark vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none" />
    </div>
  )
}
