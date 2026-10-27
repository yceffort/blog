import '@/styles/stylex.css'
import {
  AmbientEffects,
  AppleStartupImages,
  BotTracker,
  GoogleAnalyticsPageViewTracker,
  GoogleAnalyticsScripts,
  OutboundLinkTracker,
  Providers,
} from '@yceffort/shared/components'
import {THEME_COOKIE_SCRIPT} from '@yceffort/shared/utils'
import type {Metadata} from 'next'
import {Suspense, type ReactNode} from 'react'

import LayoutWrapper from '@/components/LayoutWrapper'
import PreferenceSync from '@/components/PreferenceSync'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import {SiteConfig} from '@/config'
import startupImages from '@/splash.json'

const ACCENT_COOKIE_SCRIPT =
  '(function(){try{var m=document.cookie.match(/(?:^|;\\s*)tw-accent=([^;]+)/);if(m){document.body.dataset.accent=decodeURIComponent(m[1]);}}catch(e){}})();'

export const metadata: Metadata = {
  title: {
    default: SiteConfig.title,
    template: `%s | ${SiteConfig.title}`,
  },
  description: SiteConfig.description,
  authors: [{name: SiteConfig.author.name}],
  referrer: 'origin-when-cross-origin',
  creator: SiteConfig.author.name,
  publisher: SiteConfig.author.name,
  metadataBase: new URL(SiteConfig.url),
  openGraph: {
    title: SiteConfig.title,
    description: SiteConfig.description,
    url: SiteConfig.url,
    siteName: SiteConfig.title,
    locale: 'ko_KR',
    type: 'website',
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
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return (
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
        <AppleStartupImages images={startupImages} />
      </head>
      <body>
        {/* 블로그 설정에서 고른 액센트 색(.yceffort.kr 쿠키)을 칠하기 전에 따라간다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: ACCENT_COOKIE_SCRIPT,
          }}
        />
        <AmbientEffects />
        <Providers>
          <PreferenceSync />
          <LayoutWrapper>{children}</LayoutWrapper>
        </Providers>
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
            <ServiceWorkerRegistration />
          </>
        )}
      </body>
    </html>
  )
}
