'use client'

import { useState } from 'react'

export default function AboutPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Expanded card */}
      <div
        className={`pointer-events-auto w-64 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white shadow-xl transition-all duration-300 overflow-hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        aria-hidden={!open}
      >
        <div className="px-4 pt-4 pb-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
            About this demo
          </p>
          <p className="text-xs text-white/70 leading-relaxed">
            Web translation of the{' '}
            <a
              href="https://www.mux.com/blog/slop-social"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/90 underline underline-offset-2 hover:text-white transition-colors"
            >
              Slop Social
            </a>{' '}
            architecture from Mux.
          </p>

          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Built with
            </p>
            <ul className="text-xs text-white/70 space-y-0.5">
              {[
                'Next.js',
                'Mux Player',
                'CSS Scroll Snap',
                'IntersectionObserver',
                'Directional preload window',
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-white/30 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1 pt-1 border-t border-white/10">
            <a
              href="https://www.mux.com/blog/slop-social"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/60 hover:text-white/90 transition-colors flex items-center gap-1.5"
            >
              <span className="text-white/30">→</span> Original article
            </a>
            <a
              href="https://github.com/jrguill3n/RGFeed"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/60 hover:text-white/90 transition-colors flex items-center gap-1.5"
            >
              <span className="text-white/30">→</span> Source code
            </a>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      <button
        className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white/90 hover:border-white/20 transition-all shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close about panel' : 'Open about panel'}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
        About this demo
      </button>
    </div>
  )
}
