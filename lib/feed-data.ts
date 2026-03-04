/**
 * Feed data types and utilities.
 *
 * The actual video list is fetched from /api/mux/assets at runtime.
 * SEED_METADATA provides display metadata (captions, usernames, etc.)
 * that is cycled over the real playback IDs returned by the API.
 */

export interface FeedItem {
  id: string
  playbackId: string
  caption: string
  likes: number
  username: string
  handle: string
  description: string
  song: string
  comments: number
  shares: number
}

/** Shape returned by /api/mux/assets */
export interface MuxVideo {
  id: string
  playbackId: string
  createdAt?: string | number | null
}

/** Display metadata cycled over real Mux videos */
const SEED_METADATA = [
  { caption: 'Golden hour vibes hitting different today #sunset #vibes #fyp', username: 'Jordan Lee', handle: '@jordanlee', description: 'Golden hour vibes hitting different today', song: 'Golden Hour — JVKE', comments: 4812, shares: 9201, likes: 284300 },
  { caption: 'POV: you finally nailed the perfect shot #photography #creative', username: 'Alex Rivera', handle: '@alexrivera', description: 'POV: you finally nailed the perfect shot', song: 'Snooze — SZA', comments: 8340, shares: 21000, likes: 512000 },
  { caption: 'Morning routine that changed my life #wellness #morning', username: 'Maya Chen', handle: '@mayachen', description: 'Morning routine that changed my life', song: 'Levitating — Dua Lipa', comments: 2100, shares: 5430, likes: 93100 },
  { caption: 'When the beat drops and you just KNOW #music #dance #fyp', username: 'Sam Torres', handle: '@samtorres', description: 'When the beat drops and you just KNOW', song: 'Flowers — Miley Cyrus', comments: 34000, shares: 88000, likes: 1200000 },
  { caption: 'Cooking this for dinner every single week #food #recipe', username: 'Riley Park', handle: '@rileypark', description: 'Cooking this for dinner every single week', song: 'As It Was — Harry Styles', comments: 12000, shares: 28000, likes: 430000 },
  { caption: 'Travel hack that saved me $800 #travel #lifehack #tips', username: 'Casey Kim', handle: '@caseykim', description: 'Travel hack that saved me $800', song: 'Stay — The Kid LAROI', comments: 19000, shares: 51000, likes: 765000 },
  { caption: 'The forest at 5am is absolutely unreal #nature #forest', username: 'Morgan Ellis', handle: '@morganellis', description: 'The forest at 5am is absolutely unreal', song: 'Heat Waves — Glass Animals', comments: 6700, shares: 14000, likes: 221000 },
  { caption: 'Just vibing with the crew #friends #summer #memories', username: 'Drew Santos', handle: '@drewsantos', description: 'Just vibing with the crew', song: 'About Damn Time — Lizzo', comments: 8900, shares: 22000, likes: 380000 },
  { caption: 'Surprise! The reaction I waited a year to capture #wholesome', username: 'Taylor Quinn', handle: '@taylorquinn', description: 'The reaction I waited a year to capture', song: 'Perfect — Ed Sheeran', comments: 67000, shares: 190000, likes: 2100000 },
  { caption: 'Thrift flip that took 3 hours — worth it? #fashion #thrift', username: 'Sage Ortiz', handle: '@sageortiz', description: 'Thrift flip that took 3 hours', song: 'Good 4 U — Olivia Rodrigo', comments: 22000, shares: 45000, likes: 640000 },
  { caption: 'City lights from the rooftop #citylife #nighttime #urban', username: 'Noa Blake', handle: '@noablake', description: 'City lights from the rooftop', song: 'Blinding Lights — The Weeknd', comments: 11200, shares: 31000, likes: 487000 },
  { caption: 'Tested every viral coffee hack — results inside #coffee', username: 'Jamie Wu', handle: '@jamiewu', description: 'Every viral coffee hack, tested', song: 'Espresso — Sabrina Carpenter', comments: 5600, shares: 17000, likes: 312000 },
  { caption: 'Sunset sail on the open water #sailing #ocean #wanderlust', username: 'Priya Nair', handle: '@priyanair', description: 'Sunset sail on the open water', song: 'Watermelon Sugar — Harry Styles', comments: 3400, shares: 8800, likes: 195000 },
  { caption: 'Found this hidden cafe and now I can never leave #cafelife', username: 'Felix Mora', handle: '@felixmora', description: 'Found this hidden cafe', song: 'Lover — Taylor Swift', comments: 7100, shares: 19500, likes: 329000 },
  { caption: 'One year of progress — never give up #fitness #transformation', username: 'Zara Ahmed', handle: '@zaraahmed', description: 'One year of progress', song: 'Eye of the Tiger — Survivor', comments: 28000, shares: 72000, likes: 1450000 },
  { caption: 'Late night drive, windows down, perfect playlist #roadtrip', username: 'Eli Cross', handle: '@elicross', description: 'Late night drive, windows down', song: 'Midnight Rain — Taylor Swift', comments: 9300, shares: 24000, likes: 418000 },
  { caption: 'When your dog sees you after 2 weeks #dogs #pets #wholesome', username: 'Suki Park', handle: '@sukipark', description: 'When your dog sees you after 2 weeks', song: 'Puppy Love — Paul Anka', comments: 41000, shares: 105000, likes: 2800000 },
  { caption: 'Handmade pottery from scratch — my first bowl! #pottery #craft', username: 'Leo Bauer', handle: '@leobauer', description: 'Handmade pottery from scratch', song: 'Simple — Florida Georgia Line', comments: 6200, shares: 15000, likes: 274000 },
  { caption: 'Street food tour of Tokyo — every bite was insane #japan', username: 'Mia Tanaka', handle: '@miatanaka', description: 'Street food tour of Tokyo', song: 'Tokyo — Imagine Dragons', comments: 18000, shares: 49000, likes: 870000 },
  { caption: 'Learning to surf at 35 — it is never too late #surfing', username: 'Omar Diaz', handle: '@omardiaz', description: 'Learning to surf at 35', song: 'Life is a Highway — Tom Cochrane', comments: 13500, shares: 36000, likes: 593000 },
]

/**
 * Merges real Mux video data with cycled display metadata.
 * If the API returns fewer videos than SEED_METADATA, only that many items render.
 * If it returns more, metadata wraps around (modulo).
 */
export function buildFeedItems(videos: MuxVideo[]): FeedItem[] {
  return videos.map((video, i) => {
    const meta = SEED_METADATA[i % SEED_METADATA.length]
    return {
      id: video.id,
      playbackId: video.playbackId,
      caption: meta.caption,
      likes: meta.likes,
      username: meta.username,
      handle: meta.handle,
      description: meta.description,
      song: meta.song,
      comments: meta.comments,
      shares: meta.shares,
    }
  })
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
