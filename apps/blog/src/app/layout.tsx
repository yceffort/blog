import * as stylex from '@stylexjs/stylex'
import {
  AmbientEffects,
  AppleStartupImages,
  BotTracker,
  GoogleAnalyticsPageViewTracker,
  GoogleAnalyticsScripts,
  OutboundLinkTracker,
  Providers,
} from '@yceffort/shared/components'
import {buildOgImageUrl, THEME_COOKIE_SCRIPT} from '@yceffort/shared/utils'
import type {Metadata} from 'next'

import '@/styles/stylex.css'
import '@/styles/tokens.stylex'

import type {ReactNode} from 'react'

import {CwvTelemetry} from '@/components/analytics/CwvTelemetry'
import {GoogleAnalyticsWebVitalsTracker} from '@/components/analytics/GoogleAnalyticsWebVitalsTracker'
import {InternalNavTracker} from '@/components/analytics/InternalNavTracker'
import * as ambientStyles from '@/components/layout/ambient.styles'
import LayoutWrapper from '@/components/layout/LayoutWrapper'
import NavigationDirection from '@/components/layout/NavigationDirection'
import PullToRefresh from '@/components/pwa/PullToRefresh'
import {ServiceWorkerRegistration} from '@/components/pwa/ServiceWorkerRegistration'
import {SiteConfig} from '@/config'
import startupImages from '@/splash.json'
import {getAllPosts} from '@/utils/Post'
const sx = stylex.create({
  body: {
    '@layer utilities': {
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    },
  },
})
export const metadata: Metadata = {
  title: {
    default: SiteConfig.title,
    template: `%s | ${SiteConfig.title}`,
  },
  description: 'Frontend-focused full stack engineer',
  authors: [
    {
      name: SiteConfig.author.name,
    },
  ],
  referrer: 'origin-when-cross-origin',
  creator: SiteConfig.author.name,
  publisher: SiteConfig.author.name,
  metadataBase: new URL('https://yceffort.kr'),
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: SiteConfig.title,
    description: 'Frontend-focused full stack engineer',
    url: 'https://yceffort.kr',
    siteName: SiteConfig.title,
    images: [
      {
        url: buildOgImageUrl({
          title: SiteConfig.title,
          description: 'Frontend-focused full stack engineer',
          type: 'page',
        }),
        width: 1200,
        height: 630,
        alt: SiteConfig.title,
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  // title, description, images는 Next가 각 페이지의 openGraph에서 채운다
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: '/favicon/apple-touch-icon.png',
    shortcut: '/favicon/apple-touch-icon.png',
    apple: '/favicon/apple-touch-icon.png',
    other: {
      rel: '/favicon/apple-icon-precomposed',
      url: '/favicon/apple-icon-precomposed.png',
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
const GA_MEASUREMENT_ID = SiteConfig.googleAnalyticsId
export default async function Layout({children}: {children: ReactNode}) {
  const enSlugs = (await getAllPosts('en')).map((post) => post.fields.slug)
  return (
    <>
      <html lang="ko" data-scroll-behavior="smooth" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: THEME_COOKIE_SCRIPT,
            }}
          />
          <link
            rel="alternate"
            type="application/rss+xml"
            title="RSS Feed"
            href="/feed.xml"
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
          <meta name="theme-color" content="#ffffff" />
          <meta name="mobile-web-app-capable" content="yes" />
          <AppleStartupImages images={startupImages} />
        </head>
        <body className={stylex.props(sx.body).className}>
          <NavigationDirection />
          <AmbientEffects
            classNames={{
              animBg: ambientStyles.effect_anim_bg,
              grain: ambientStyles.effect_grain,
              cursorGlow: ambientStyles.effect_cursor_glow,
            }}
          />
          <PullToRefresh />
          {/* 본문을 Suspense로 감싸면 React가 12.8KB를 넘는 경계는 완성돼 있어도 hidden 세그먼트로
              빼내므로 JS 없는 크롤러가 본문을 못 읽는다. usePathname 소비자는 경계 없이도 빌드가 통과한다 */}
          <Providers>
            <LayoutWrapper enSlugs={enSlugs}>{children}</LayoutWrapper>
          </Providers>
          {GA_MEASUREMENT_ID && process.env.NODE_ENV === 'production' && (
            <>
              <GoogleAnalyticsScripts
                measurementId={GA_MEASUREMENT_ID}
                siteUrl={SiteConfig.url}
              />
              <GoogleAnalyticsPageViewTracker />
              <OutboundLinkTracker />
              <InternalNavTracker />
            </>
          )}
          {process.env.NODE_ENV === 'production' && (
            <>
              <GoogleAnalyticsWebVitalsTracker />
              <CwvTelemetry />
              <BotTracker />
              <ServiceWorkerRegistration />
            </>
          )}
        </body>
      </html>
    </>
  )
}
