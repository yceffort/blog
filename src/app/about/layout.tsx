import type { ReactNode } from 'react'
import type { Metadata } from 'next'

import { SiteConfig } from '#src/config'

export const metadata: Metadata = {
  title: 'About - ' + SiteConfig.title,
  description: 'Frontend-focused full stack engineer based in Korea.',
  openGraph: {
    title: 'About - ' + SiteConfig.title,
    description: 'Frontend-focused full stack engineer based in Korea.',
    url: `${SiteConfig.url}/about`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent('About - ' + SiteConfig.title)}&description=${encodeURIComponent('Frontend-focused full stack engineer based in Korea.')}&path=${encodeURIComponent('/about')}&type=page`,
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return <>{children}</>
}