import SnapFeed from '@/components/SnapFeed'
import FeedNav from '@/components/feed/FeedNav'

export default function HomePage() {
  return (
    <main className="relative w-full bg-black overflow-hidden" style={{ height: '100dvh' }}>
      <FeedNav />
      <SnapFeed />
    </main>
  )
}
