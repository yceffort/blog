import '@/styles/stylex.css'
import '@/styles/offline.css'
import {
  AmbientEffects,
  BotTracker,
  GoogleAnalyticsPageViewTracker,
  GoogleAnalyticsScripts,
  OutboundLinkTracker,
  Providers,
} from '@yceffort/shared/components'
import {THEME_COOKIE_SCRIPT} from '@yceffort/shared/utils'
import type {Metadata} from 'next'
import {Suspense, type ReactNode} from 'react'

import {OfflineRegistration} from '@/components/offline/OfflineRegistration'
import {SiteConfig} from '@/config'

export const metadata: Metadata = {
  title: SiteConfig.title,
  description: 'yceffort research — 프론트엔드 딥다이브 슬라이드',
  authors: [{name: SiteConfig.author.name}],
  referrer: 'origin-when-cross-origin',
  creator: SiteConfig.author.name,
  publisher: SiteConfig.author.name,
  metadataBase: new URL('https://research.yceffort.kr'),
  openGraph: {
    title: SiteConfig.title,
    description: 'yceffort research — 프론트엔드 딥다이브 슬라이드',
    url: SiteConfig.url,
    siteName: SiteConfig.title,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(SiteConfig.title)}&description=${encodeURIComponent('프론트엔드 딥다이브 슬라이드')}`,
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SiteConfig.title,
    description: 'yceffort research — 프론트엔드 딥다이브 슬라이드',
    images: [
      `/api/og?title=${encodeURIComponent(SiteConfig.title)}&description=${encodeURIComponent('프론트엔드 딥다이브 슬라이드')}`,
    ],
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: '/favicon/apple-touch-icon.png',
    shortcut: '/favicon/apple-touch-icon.png',
    apple: '/favicon/apple-touch-icon.png',
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return (
    <>
      <html lang="ko" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: THEME_COOKIE_SCRIPT,
            }}
          />
          <link
            rel="icon"
            type="image/png"
            href="/favicon/favicon-96x96.png"
            sizes="96x96"
          />
          <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
          <link rel="shortcut icon" href="/favicon/favicon.ico" />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/favicon/apple-touch-icon.png"
          />
          <link rel="manifest" href="/favicon/site.webmanifest" />
        </head>
        <body>
          <OfflineRegistration />
          <AmbientEffects />
          <Providers>{children}</Providers>
          {process.env.NODE_ENV === 'production' && (
            <>
              <GoogleAnalyticsScripts
                measurementId={SiteConfig.googleAnalyticsId}
                siteUrl={SiteConfig.url}
              />
              <Suspense fallback={null}>
                <GoogleAnalyticsPageViewTracker />
                <BotTracker />
              </Suspense>
              <OutboundLinkTracker />
            </>
          )}
        </body>
      </html>
    </>
  )
}
