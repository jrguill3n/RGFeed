import type { Metadata, Viewport } from 'next'
import { Barlow } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-barlow',
})

export const metadata: Metadata = {
  title: 'RGFeed — Vertical Video',
  description: 'TikTok-style vertical video feed powered by Mux',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: '#000000',
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${barlow.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
