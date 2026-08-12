import './tailwind.css'
import {Providers} from '@yceffort/shared/components'
import type {Metadata} from 'next'
import {Fraunces, Inter, JetBrains_Mono} from 'next/font/google'
import Script from 'next/script'
import {Suspense, type ReactNode} from 'react'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  style: ['italic', 'normal'],
})

import AmbientEffects from '@/components/AmbientEffects'
import {BotTracker} from '@/components/BotTracker'
import {GoogleAnalyticsPageViewTracker} from '@/components/GoogleAnalyticsPageViewTracker'
import {GoogleAnalyticsWebVitalsTracker} from '@/components/GoogleAnalyticsWebVitalsTracker'
import LayoutWrapper from '@/components/LayoutWrapper'
import NavigationDirection from '@/components/NavigationDirection'
import {OutboundLinkTracker} from '@/components/OutboundLinkTracker'
import {ServiceWorkerRegistration} from '@/components/ServiceWorkerRegistration'
import {SiteConfig} from '@/config'
import {buildOgImageUrl} from '@/utils/og'
import {getAllPosts} from '@/utils/Post'

export const metadata: Metadata = {
  title: SiteConfig.title,
  description: SiteConfig.url,
  authors: [{name: SiteConfig.author.name}],
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
  twitter: {
    card: 'summary_large_image',
    title: SiteConfig.title,
    description: 'Frontend-focused full stack engineer',
    images: [
      buildOgImageUrl({
        title: SiteConfig.title,
        description: 'Frontend-focused full stack engineer',
        type: 'page',
      }),
    ],
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
      <html
        lang="ko"
        data-scroll-behavior="smooth"
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
      >
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)tw-theme=([^;]+)/);if(m){localStorage.setItem('theme',decodeURIComponent(m[1]));}}catch(e){}})();`,
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
        </head>
        <body className="antialiased">
          <Suspense fallback={null}>
            <NavigationDirection />
          </Suspense>
          <AmbientEffects />
          <Providers>
            <Suspense fallback={null}>
              <LayoutWrapper enSlugs={enSlugs}>{children}</LayoutWrapper>
            </Suspense>
          </Providers>
          {GA_MEASUREMENT_ID && (
            <>
              <Script
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              />
              <Script
                id="google-analytics"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
                }}
              />
              <Suspense fallback={null}>
                <GoogleAnalyticsPageViewTracker />
              </Suspense>
              <OutboundLinkTracker />
            </>
          )}
          {process.env.NODE_ENV === 'production' && (
            <>
              <GoogleAnalyticsWebVitalsTracker />
              <BotTracker />
              <ServiceWorkerRegistration />
            </>
          )}
        </body>
      </html>
    </>
  )
}
