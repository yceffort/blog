import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import {SiteConfig} from '#src/config'
import {buildOgImageUrl} from '#utils/og'

export const metadata: Metadata = {
  title: 'About - ' + SiteConfig.title,
  description: 'Frontend-focused full stack engineer based in Korea.',
  openGraph: {
    title: 'About - ' + SiteConfig.title,
    description: 'Frontend-focused full stack engineer based in Korea.',
    url: `${SiteConfig.url}/about`,
    images: [
      {
        url: buildOgImageUrl({
          title: 'About - ' + SiteConfig.title,
          description: 'Frontend-focused full stack engineer based in Korea.',
          path: '/about',
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
