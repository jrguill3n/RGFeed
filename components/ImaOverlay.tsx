'use client'

/**
 * ImaOverlay
 *
 * One fixed-position Google IMA SDK container shared across the entire feed.
 * Only active when an ad slot is the current item. Content playback
 * (SharedPlayer) is hidden while an ad is playing.
 *
 * IMA lifecycle per activation:
 *  1. Load ima3.js once (singleton promise).
 *  2. Create AdDisplayContainer + AdsLoader.
 *  3. Fire VAST request; AdsManager drives playback inside this container.
 *  4. On ALL_ADS_COMPLETED / error, signal done so the feed can advance.
 */

import { useEffect, useRef, useState } from 'react'
import { AdItem } from '@/lib/feed-data'

// ---------------------------------------------------------------------------
// IMA SDK singleton loader
// ---------------------------------------------------------------------------
let imaReady: Promise<void> | null = null

function loadImaSDK(): Promise<void> {
  if (imaReady) return imaReady
  imaReady = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve()
    if ((window as Window & { google?: { ima?: unknown } }).google?.ima) return resolve()
    const script = document.createElement('script')
    script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load IMA SDK'))
    document.head.appendChild(script)
  })
  return imaReady
}

interface ImaSDK {
  AdDisplayContainer: new (adContainer: HTMLElement, videoElement: HTMLVideoElement) => {
    initialize(): void
    destroy(): void
  }
  AdsLoader: new (adc: unknown) => {
    addEventListener(event: string, handler: (e: unknown) => void, bubbles: boolean): void
    requestAds(req: unknown): void
    destroy(): void
  }
  AdsRequest: new () => {
    adTagUrl: string
    linearAdSlotWidth: number
    linearAdSlotHeight: number
    nonLinearAdSlotWidth: number
    nonLinearAdSlotHeight: number
  }
  AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: string } }
  AdErrorEvent: { Type: { AD_ERROR: string } }
  AdEvent: {
    Type: {
      CONTENT_PAUSE_REQUESTED: string
      ALL_ADS_COMPLETED: string
      SKIPPED: string
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ViewMode?: any
}

function getIma(): ImaSDK | null {
  return (window as Window & { google?: { ima?: ImaSDK } }).google?.ima ?? null
}

interface Props {
  /** The currently active ad slot, or null when a content video is active. */
  activeAd: AdItem | null
  hasInteracted: boolean
}

type AdState = 'idle' | 'loading' | 'playing' | 'done' | 'error'

export default function ImaOverlay({ activeAd, hasInteracted }: Props) {
  const adContainerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adDisplayContainerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adsLoaderRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adsManagerRef = useRef<any>(null)

  const [adState, setAdState] = useState<AdState>('idle')
  const [adError, setAdError] = useState<string | null>(null)

  // Reset and re-request whenever the activeAd changes
  useEffect(() => {
    setAdState('idle')
    setAdError(null)

    // Destroy previous IMA session
    adsManagerRef.current?.destroy?.()
    adsLoaderRef.current?.destroy?.()
    adDisplayContainerRef.current?.destroy?.()
    adsManagerRef.current = null
    adsLoaderRef.current = null
    adDisplayContainerRef.current = null
  }, [activeAd?.id])

  // Request + play the ad when active and user has interacted
  useEffect(() => {
    if (!activeAd || !hasInteracted || adState !== 'idle') return

    const adContainerEl = adContainerRef.current
    const videoEl = videoRef.current
    if (!adContainerEl || !videoEl) return

    setAdState('loading')

    loadImaSDK()
      .then(() => {
        const ima = getIma()
        if (!ima) throw new Error('IMA SDK unavailable')

        const adc = new ima.AdDisplayContainer(adContainerEl, videoEl)
        adc.initialize()
        adDisplayContainerRef.current = adc

        const loader = new ima.AdsLoader(adc)
        adsLoaderRef.current = loader

        loader.addEventListener(
          ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (event: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const manager = (event as any).getAdsManager(videoEl)
            adsManagerRef.current = manager

            manager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => setAdState('playing'), false)
            manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => setAdState('done'), false)
            manager.addEventListener(ima.AdEvent.Type.SKIPPED, () => setAdState('done'), false)

            try {
              const { width, height } = adContainerEl.getBoundingClientRect()
              manager.init(width, height, ima.ViewMode?.NORMAL ?? 'normal')
              manager.start()
            } catch {
              setAdState('error')
              setAdError('Ad playback failed to start.')
            }
          },
          false
        )

        loader.addEventListener(
          ima.AdErrorEvent.Type.AD_ERROR,
          () => {
            setAdState('error')
            setAdError('Ad unavailable.')
          },
          false
        )

        const req = new ima.AdsRequest()
        req.adTagUrl = activeAd.adTagUrl
        req.linearAdSlotWidth = adContainerEl.offsetWidth
        req.linearAdSlotHeight = adContainerEl.offsetHeight
        req.nonLinearAdSlotWidth = adContainerEl.offsetWidth
        req.nonLinearAdSlotHeight = 150
        loader.requestAds(req)
      })
      .catch(() => {
        setAdState('error')
        setAdError('Ad SDK unavailable.')
      })

    return () => {
      adsManagerRef.current?.destroy?.()
      adsLoaderRef.current?.destroy?.()
      adDisplayContainerRef.current?.destroy?.()
      adsManagerRef.current = null
      adsLoaderRef.current = null
      adDisplayContainerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAd?.id, hasInteracted])

  // Visibility: only show when an ad slot is active
  const isVisible = activeAd !== null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2,
        pointerEvents: isVisible ? 'auto' : 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 200ms ease',
        background: '#000',
      }}
      aria-hidden={!isVisible}
    >
      {/* IMA requires a content video element as reference */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        style={{ transform: 'translateZ(0)' }}
      />

      {/* IMA renders the VAST creative inside this div */}
      <div
        ref={adContainerRef}
        className="absolute inset-0"
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      />

      {/* Ad UI overlay (Sponsored badge, headline, CTA) */}
      {activeAd && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end z-10">
          <div className="px-4 pb-6 space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-2.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <span className="text-[11px] font-semibold text-white/90 tracking-wide uppercase">
                Sponsored
              </span>
            </div>
            <p className="text-sm font-bold text-white drop-shadow-sm">{activeAd.advertiser}</p>
            <p className="text-base font-semibold text-white/90 leading-snug max-w-[260px] text-pretty drop-shadow-sm">
              {activeAd.headline}
            </p>
            <a
              href={activeAd.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto inline-flex items-center gap-2 bg-white text-black text-sm font-bold px-4 py-2 rounded-full mt-1 hover:bg-white/90 transition-colors"
            >
              {activeAd.ctaText}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {adState === 'error' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/60">
          <p className="text-sm text-white/50">{adError ?? 'Ad unavailable'}</p>
          <p className="text-xs text-white/30">Scroll to continue</p>
        </div>
      )}

      {/* Loading spinner */}
      {adState === 'loading' && (
        <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center pointer-events-none">
          <div className="w-4 h-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
        </div>
      )}
    </div>
  )
}
