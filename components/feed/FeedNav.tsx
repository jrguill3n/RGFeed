import { Search } from 'lucide-react'

export default function FeedNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 pointer-events-none">
      {/* Gradient fade so text is readable over video */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

      <nav className="relative flex items-center justify-between px-4 pt-3 pb-4 pointer-events-auto">
        {/* Left: logo */}
        <span className="text-foreground font-black text-2xl tracking-widest uppercase select-none">
          RG<span className="text-accent">Feed</span>
        </span>

        {/* Center: tabs */}
        <div className="flex items-center gap-6">
          <button className="text-muted-foreground text-sm font-medium">
            Following
          </button>
          <button className="text-foreground text-sm font-bold border-b-2 border-foreground pb-0.5">
            For You
          </button>
        </div>

        {/* Right: search */}
        <button
          className="text-foreground"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>
      </nav>
    </header>
  )
}
