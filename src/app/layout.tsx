import './tailwind.css'

import Script from 'next/script'

import {Analytics as VercelAnalytics} from '@vercel/analytics/react'
import {SpeedInsights as VercelSpeedInsights} from '@vercel/speed-insights/next'

import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import FloatingBanner from '#components/Banner'
import {GoogleAnalyticsWebVitalsTracker} from '#components/GoogleAnalyticsWebVitalsTracker'
import LayoutWrapper from '#components/LayoutWrapper'
import {Providers} from '#components/Provider'
import {SiteConfig} from '#src/config'

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

export default function Layout({children}: {children: ReactNode}) {
  return (
    <>
      <html lang="kr" suppressHydrationWarning>
        <head>
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
            href="/apple-touch-icon.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
        </head>
        <body className="bg-white text-black antialiased dark:bg-gray-900 dark:text-white">
          <Providers>
            <LayoutWrapper>{children}</LayoutWrapper>
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
          <VercelAnalytics />
          <VercelSpeedInsights />
          <GoogleAnalyticsWebVitalsTracker />
          <FloatingBanner />
        </body>
      </html>
    </>
  )
}
