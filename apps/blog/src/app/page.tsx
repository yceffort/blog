import {buildOgImageUrl} from '@yceffort/shared/utils'
import type {Metadata} from 'next'

import HomeView from '@/components/home/HomeView'
import {SiteConfig} from '@/config'
import {openGraphBase} from '@/utils/metadata'
export const metadata: Metadata = {
  title: SiteConfig.title,
  description: SiteConfig.subtitle,
  openGraph: {
    ...openGraphBase('ko'),
    title: SiteConfig.title,
    description: SiteConfig.subtitle,
    url: SiteConfig.url,
    images: [
      {
        url: buildOgImageUrl({
          title: SiteConfig.title,
          description: `${SiteConfig.subtitle}'s blog`,
          path: '/',
          type: 'page',
        }),
        width: 1200,
        height: 630,
      },
    ],
  },
}
export default function Page() {
  return <HomeView locale="ko" />
}
