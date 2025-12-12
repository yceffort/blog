import type { ReactNode } from 'react'
import type { Metadata } from 'next'

import { SiteConfig } from '#src/config'

export const metadata: Metadata = {
  title: 'Resume - ' + SiteConfig.title,
  description: 'Experienced Frontend-focused Fullstack Engineer\'s Resume',
  openGraph: {
    title: 'Resume - ' + SiteConfig.title,
    description: 'Experienced Frontend-focused Fullstack Engineer\'s Resume',
    url: `${SiteConfig.url}/resume`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent('Resume - ' + SiteConfig.title)}&description=${encodeURIComponent('Experienced Frontend-focused Fullstack Engineer\'s Resume')}&path=${encodeURIComponent('/resume')}&type=page`,
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return <>{children}</>
}