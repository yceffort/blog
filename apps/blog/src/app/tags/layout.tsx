import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import {SiteConfig} from '#src/config'
import {buildOgImageUrl} from '#utils/og'

export const metadata: Metadata = {
  title: 'Tags - ' + SiteConfig.title,
  description: 'All posts by tags',
  openGraph: {
    title: 'Tags - ' + SiteConfig.title,
    description: 'All posts by tags',
    url: `${SiteConfig.url}/tags`,
    images: [
      {
        url: buildOgImageUrl({
          title: 'Tags - ' + SiteConfig.title,
          description: 'All posts by tags',
          path: '/tags',
          type: 'page',
        }),
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return <>{children}</>
}
