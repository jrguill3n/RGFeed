'use client'

/**
 * DebugOverlay
 *
 * Fixed top-left panel showing feed state for development inspection.
 * Only renders when the URL contains ?debug=1.
 *
 * Usage: append ?debug=1 to the URL to enable.
 */

import { useEffect, useState } from 'react'

interface Props {
  currentIndex: number
  scrollDirection: 'down' | 'up'
  preloadCount: number
}

export default function DebugOverlay({ currentIndex, scrollDirection, preloadCount }: Props) {
  const [enabled, setEnabled] = useState(false)

  // Read query param on the client only (avoids SSR mismatch)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setEnabled(params.get('debug') === '1')
  }, [])

  if (!enabled) return null

  return (
    <div
      className="fixed top-3 left-3 z-50 pointer-events-none font-mono text-[11px] leading-5 bg-black/70 text-green-400 border border-green-500/40 rounded-md px-3 py-2 space-y-0.5 backdrop-blur-sm"
      aria-hidden="true"
    >
      <div>
        <span className="text-green-600">currentIndex</span>
        {' '}{currentIndex}
      </div>
      <div>
        <span className="text-green-600">scrollDirection</span>
        {' '}{scrollDirection}
      </div>
      <div>
        <span className="text-green-600">preloaded</span>
        {' '}{preloadCount} items
      </div>
    </div>
  )
}
