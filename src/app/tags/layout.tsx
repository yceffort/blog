import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import {SiteConfig} from '#src/config'

export const metadata: Metadata = {
  title: 'Tags - ' + SiteConfig.title,
  description: 'All posts by tags',
  openGraph: {
    title: 'Tags - ' + SiteConfig.title,
    description: 'All posts by tags',
    url: `${SiteConfig.url}/tags`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent('Tags - ' + SiteConfig.title)}&description=${encodeURIComponent('All posts by tags')}&path=${encodeURIComponent('/tags')}&type=page`,
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return <>{children}</>
}
