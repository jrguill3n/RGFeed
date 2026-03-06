'use client'

/**
 * AdCell
 *
 * A single ad slot in the vertical feed — visually indistinguishable from a
 * content item but powered by Google IMA SDK (VAST).
 *
 * Integration overview:
 *  1. Load the IMA SDK script once via a shared singleton promise.
 *  2. When this cell becomes active, create an AdDisplayContainer,
 *     AdsLoader, and fire an AdsRequest with the supplied VAST tag.
 *  3. AdsManager drives the actual ad playback inside the ad container.
 *  4. On error or skip, the cell signals completion and the feed continues.
 *
 * Scroll snap behavior is preserved — the cell is the same 100dvh height
 * as any content VideoCell.
 */

import { useEffect, useRef, useState } from 'react'
import { AdItem } from '@/lib/feed-data'

// ---------------------------------------------------------------------------
// IMA SDK loader — loads the script once per page, returns a promise that
// resolves when window.google.ima is available.
// ---------------------------------------------------------------------------
let imaReady: Promise<void> | null = null

function loadImaSDK(): Promise<void> {
  if (imaReady) return imaReady
  imaReady = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()
    // Already loaded
    if ((window as Window & typeof globalThis & { google?: { ima?: unknown } }).google?.ima) {
      return resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load IMA SDK'))
    document.head.appendChild(script)
  })
  return imaReady
}

// Minimal typings for the parts of the IMA SDK we use
// (avoids a full @types/google-ima3 dependency for this POC)
interface ImaSDK {
  AdDisplayContainer: new (
    adContainer: HTMLElement,
    videoElement: HTMLVideoElement
  ) => { initialize(): void; destroy(): void }
  AdsLoader: new (adDisplayContainer: unknown) => {
    addEventListener(event: string, handler: (e: unknown) => void, bubbles: boolean): void
    requestAds(req: unknown): void
    destroy(): void
  }
  AdsRequest: new () => { adTagUrl: string; linearAdSlotWidth: number; linearAdSlotHeight: number; nonLinearAdSlotWidth: number; nonLinearAdSlotHeight: number }
  AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: string } }
  AdErrorEvent: { Type: { AD_ERROR: string } }
  AdEvent: {
    Type: {
      CONTENT_PAUSE_REQUESTED: string
      CONTENT_RESUME_REQUESTED: string
      ALL_ADS_COMPLETED: string
      SKIPPED: string
    }
  }
  AdsManager: unknown
}

function getIma(): ImaSDK | null {
  return (
    (window as Window & typeof globalThis & { google?: { ima?: ImaSDK } }).google?.ima ?? null
  )
}

interface Props {
  ad: AdItem
  index: number
  isActive: boolean
  hasInteracted: boolean
  observerRef: (el: HTMLDivElement | null) => void
}

type AdState = 'idle' | 'loading' | 'playing' | 'done' | 'error'

export default function AdCell({ ad, index, isActive, hasInteracted, observerRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const adContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // IMA lifecycle objects — stored in refs so effects don't re-run on changes
  const adDisplayContainerRef = useRef<InstanceType<ImaSDK['AdDisplayContainer']> | null>(null)
  const adsLoaderRef = useRef<InstanceType<ImaSDK['AdsLoader']> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adsManagerRef = useRef<any>(null)

  const [adState, setAdState] = useState<AdState>('idle')
  const [adError, setAdError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Request + play the ad when this cell becomes active and the user has
  // interacted (required to satisfy autoplay policies).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isActive || !hasInteracted) return
    if (adState !== 'idle') return

    const adContainerEl = adContainerRef.current
    const videoEl = videoRef.current
    if (!adContainerEl || !videoEl) return

    setAdState('loading')

    loadImaSDK()
      .then(() => {
        const ima = getIma()
        if (!ima) throw new Error('IMA SDK not available')

        // 1. Create the AdDisplayContainer — wraps the ad video/overlay elements
        const adc = new ima.AdDisplayContainer(adContainerEl, videoEl)
        adc.initialize()
        adDisplayContainerRef.current = adc

        // 2. Create the AdsLoader — handles VAST/VMAP requests
        const loader = new ima.AdsLoader(adc)
        adsLoaderRef.current = loader

        // 3. Handle the AdsManager being returned
        loader.addEventListener(
          ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (event: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const e = event as any
            const manager = e.getAdsManager(videoEl)
            adsManagerRef.current = manager

            // Forward ad events
            manager.addEventListener(
              ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED,
              () => setAdState('playing'),
              false
            )
            manager.addEventListener(
              ima.AdEvent.Type.ALL_ADS_COMPLETED,
              () => setAdState('done'),
              false
            )
            manager.addEventListener(
              ima.AdEvent.Type.SKIPPED,
              () => setAdState('done'),
              false
            )

            try {
              const rect = adContainerEl.getBoundingClientRect()
              manager.init(rect.width, rect.height, ima.ViewMode?.NORMAL ?? 'normal')
              manager.start()
            } catch {
              setAdState('error')
              setAdError('Ad playback failed to start.')
            }
          },
          false
        )

        // 4. Handle ad load errors gracefully — let the feed continue
        loader.addEventListener(
          ima.AdErrorEvent.Type.AD_ERROR,
          (event: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const e = event as any
            console.error('IMA ad error:', e.getError?.()?.getMessage?.() ?? 'unknown')
            setAdState('error')
            setAdError('Ad unavailable.')
          },
          false
        )

        // 5. Fire the VAST request
        const req = new ima.AdsRequest()
        req.adTagUrl = ad.adTagUrl
        req.linearAdSlotWidth = adContainerEl.offsetWidth
        req.linearAdSlotHeight = adContainerEl.offsetHeight
        req.nonLinearAdSlotWidth = adContainerEl.offsetWidth
        req.nonLinearAdSlotHeight = 150
        loader.requestAds(req)
      })
      .catch((err) => {
        console.error('IMA SDK load error:', err)
        setAdState('error')
        setAdError('Ad SDK unavailable.')
      })

    // Cleanup: destroy IMA objects when the cell unmounts or becomes inactive
    return () => {
      adsManagerRef.current?.destroy?.()
      adsLoaderRef.current?.destroy?.()
      adDisplayContainerRef.current?.destroy?.()
      adsManagerRef.current = null
      adsLoaderRef.current = null
      adDisplayContainerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, hasInteracted])

  // Pause/resume the ad manager when isActive changes
  useEffect(() => {
    if (!adsManagerRef.current) return
    if (isActive) {
      adsManagerRef.current.resume?.()
    } else {
      adsManagerRef.current.pause?.()
    }
  }, [isActive])

  return (
    <div
      ref={(el) => {
        containerRef.current = el
        observerRef(el)
      }}
      className="feed-item relative w-full h-dvh overflow-hidden bg-black will-change-transform"
      data-id={ad.id}
      data-index={index}
    >
      {/* Silent video element required by IMA SDK as the content video reference */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        style={{ transform: 'translateZ(0)' }}
      />

      {/* IMA ad container — SDK renders the VAST creative inside here */}
      <div
        ref={adContainerRef}
        className="absolute inset-0 z-10"
        style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      />

      {/* Ad overlay: Sponsored badge + advertiser info + CTA */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end">
        {/* Bottom-left content info */}
        <div className="px-4 pb-6 space-y-2">
          {/* Sponsored badge */}
          <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="text-[11px] font-semibold text-white/90 tracking-wide uppercase">
              Sponsored
            </span>
          </div>

          <p className="text-sm font-bold text-white drop-shadow-sm">{ad.advertiser}</p>
          <p className="text-base font-semibold text-white/90 leading-snug max-w-[260px] text-pretty drop-shadow-sm">
            {ad.headline}
          </p>

          {/* CTA button — pointer-events-auto so it is tappable */}
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-2 bg-white text-black text-sm font-bold px-4 py-2 rounded-full mt-1 hover:bg-white/90 transition-colors"
          >
            {ad.ctaText}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>

      {/* Error fallback — shown if the ad fails to load */}
      {adState === 'error' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/60">
          <p className="text-sm text-white/50">{adError ?? 'Ad unavailable'}</p>
          <p className="text-xs text-white/30">Scroll to continue</p>
        </div>
      )}

      {/* Loading indicator while VAST request is in flight */}
      {adState === 'loading' && isActive && (
        <div className="absolute inset-x-0 bottom-24 z-30 flex justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  )
}
