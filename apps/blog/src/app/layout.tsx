import './tailwind.css'

import Script from 'next/script'

import {Analytics as VercelAnalytics} from '@vercel/analytics/react'
import {SpeedInsights as VercelSpeedInsights} from '@vercel/speed-insights/next'

import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import CommandPalette from '#components/CommandPalette'
import {GoogleAnalyticsWebVitalsTracker} from '#components/GoogleAnalyticsWebVitalsTracker'
import LayoutWrapper from '#components/LayoutWrapper'
import {Providers} from '#components/Provider'
import {SiteConfig} from '#src/config'
// import {getAllPosts, getAllTagsFromPosts} from '#utils/Post'

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
        url: `/api/og?title=${encodeURIComponent(SiteConfig.title)}&description=${encodeURIComponent('Frontend-focused full stack engineer')}&type=page`,
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
    images: [`/api/og?title=${encodeURIComponent(SiteConfig.title)}&description=${encodeURIComponent('Frontend-focused full stack engineer')}&type=page`],
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
  return (
    <>
      <html lang="kr" suppressHydrationWarning>
        <head>
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
        </head>
        <body className="bg-white text-black antialiased dark:bg-gray-800 dark:text-white">
          <Providers>
            <LayoutWrapper>{children}</LayoutWrapper>
            <CommandPalette />
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
            </>
          )}
          {process.env.NODE_ENV === 'production' && (
            <>
              <VercelAnalytics />
              <VercelSpeedInsights />
              <GoogleAnalyticsWebVitalsTracker />
            </>
          )}
        </body>
      </html>
    </>
  )
}
