export interface FeedItem {
  id: string
  playbackId: string
  username: string
  handle: string
  description: string
  song: string
  likes: number
  comments: number
  shares: number
}

const DEMO_PLAYBACK_ID = 'a4nOgmxGWg6gULfcBbAa00gXyfcwPnAFldF8RdsNyk8M'

export const FEED_ITEMS: FeedItem[] = [
  {
    id: '1',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Jordan Lee',
    handle: '@jordanlee',
    description: 'Golden hour vibes hitting different today ✨ #sunset #vibes #fyp',
    song: 'Golden Hour — JVKE',
    likes: 284300,
    comments: 4812,
    shares: 9201,
  },
  {
    id: '2',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Alex Rivera',
    handle: '@alexrivera',
    description: 'POV: you finally nailed the perfect shot 📸 #photography #creative',
    song: 'Snooze — SZA',
    likes: 512000,
    comments: 8340,
    shares: 21000,
  },
  {
    id: '3',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Maya Chen',
    handle: '@mayachen',
    description: 'Morning routine that changed my life ☀️ #wellness #morning #routine',
    song: 'Levitating — Dua Lipa',
    likes: 93100,
    comments: 2100,
    shares: 5430,
  },
  {
    id: '4',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Sam Torres',
    handle: '@samtorres',
    description: 'When the beat drops and you just KNOW 🔥 #music #dance #fyp',
    song: 'Flowers — Miley Cyrus',
    likes: 1200000,
    comments: 34000,
    shares: 88000,
  },
  {
    id: '5',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Riley Park',
    handle: '@rileypark',
    description: 'Cooking this for dinner every single week 🍜 #food #recipe #cooking',
    song: 'As It Was — Harry Styles',
    likes: 430000,
    comments: 12000,
    shares: 28000,
  },
  {
    id: '6',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Casey Kim',
    handle: '@caseykim',
    description: 'Travel hack that saved me $800 ✈️ #travel #lifehack #tips',
    song: 'Stay — The Kid LAROI',
    likes: 765000,
    comments: 19000,
    shares: 51000,
  },
  {
    id: '7',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Morgan Ellis',
    handle: '@morganellis',
    description: 'The forest at 5am is absolutely unreal 🌲 #nature #forest #peaceful',
    song: 'Heat Waves — Glass Animals',
    likes: 221000,
    comments: 6700,
    shares: 14000,
  },
  {
    id: '8',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Drew Santos',
    handle: '@drewsantos',
    description: 'Just vibing with the crew 🎶 #friends #summer #memories',
    song: 'About Damn Time — Lizzo',
    likes: 380000,
    comments: 8900,
    shares: 22000,
  },
  {
    id: '9',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Taylor Quinn',
    handle: '@taylorquinn',
    description: 'Surprise! The reaction I waited a year to capture 😭❤️ #wholesome #heartwarming',
    song: 'Perfect — Ed Sheeran',
    likes: 2100000,
    comments: 67000,
    shares: 190000,
  },
  {
    id: '10',
    playbackId: DEMO_PLAYBACK_ID,
    username: 'Sage Ortiz',
    handle: '@sageortiz',
    description: 'Thrift flip that took 3 hours — worth it? 🧵 #fashion #thrift #diy',
    song: 'Good 4 U — Olivia Rodrigo',
    likes: 640000,
    comments: 22000,
    shares: 45000,
  },
]

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
