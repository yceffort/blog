import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import {SiteConfig} from '#src/config'
import {buildOgImageUrl} from '#utils/og'

export const metadata: Metadata = {
  title: 'Resume - ' + SiteConfig.title,
  description: "Experienced Frontend-focused Fullstack Engineer's Resume",
  openGraph: {
    title: 'Resume - ' + SiteConfig.title,
    description: "Experienced Frontend-focused Fullstack Engineer's Resume",
    url: `${SiteConfig.url}/resume`,
    images: [
      {
        url: buildOgImageUrl({
          title: 'Resume - ' + SiteConfig.title,
          description:
            "Experienced Frontend-focused Fullstack Engineer's Resume",
          path: '/resume',
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
