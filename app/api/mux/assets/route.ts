/**
 * GET /api/mux/assets
 *
 * Server-side translation of the Slop Social Mux integration:
 * - Fetches all assets from the Mux Video API using HTTP Basic Auth
 * - Filters to only assets that have a public playback ID
 * - Sorts newest-first by created_at
 * - Returns a flat list of { id, playbackId, createdAt } for the client feed
 *
 * The client (FeedContainer) then applies directional preloading and
 * only-active playback on top of this list — no video logic lives here.
 */

import { NextResponse } from 'next/server'

interface MuxPlaybackId {
  id: string
  policy: string
}

interface MuxAsset {
  id: string
  status: string
  created_at?: string | number
  playback_ids?: MuxPlaybackId[]
}

interface MuxAssetsResponse {
  data: MuxAsset[]
}

export async function GET() {
  const tokenId = process.env.MUX_TOKEN_ID
  const tokenSecret = process.env.MUX_TOKEN_SECRET

  if (!tokenId || !tokenSecret) {
    return NextResponse.json(
      { error: 'Mux credentials not configured.' },
      { status: 500 }
    )
  }

  const credentials = Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')

  let muxData: MuxAssetsResponse

  try {
    const res = await fetch('https://api.mux.com/video/v1/assets?limit=25', {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      // Don't cache — always fetch fresh asset list
      cache: 'no-store',
    })

    if (!res.ok) {
      // Log server-side only — never forward Mux error details to the client
      console.error(`Mux API error: ${res.status}`)
      return NextResponse.json(
        { error: 'Failed to load videos.' },
        { status: 502 }
      )
    }

    muxData = await res.json()
  } catch {
    // Catch-all: swallow stack trace, return generic message
    return NextResponse.json(
      { error: 'Failed to load videos.' },
      { status: 502 }
    )
  }

  // Filter: only assets with at least one public playback ID
  const videos = muxData.data
    .filter((asset) => asset.playback_ids && asset.playback_ids.length > 0)
    .map((asset) => {
      const publicId = asset.playback_ids!.find((p) => p.policy === 'public')
      if (!publicId) return null
      return {
        id: asset.id,
        playbackId: publicId.id,
        createdAt: asset.created_at ?? null,
      }
    })
    .filter(Boolean)
    // Sort newest-first: created_at is a Unix timestamp string or number
    .sort((a, b) => {
      const ta = Number(a!.createdAt ?? 0)
      const tb = Number(b!.createdAt ?? 0)
      return tb - ta
    })

  return NextResponse.json({ videos })
}
