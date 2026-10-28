import {buildOgImageUrl} from '@yceffort/shared/utils'
import type {Metadata} from 'next'

import HomeView from '@/components/home/HomeView'
import {SiteConfig} from '@/config'
import {openGraphBase} from '@/utils/metadata'
export const metadata: Metadata = {
  title: {absolute: SiteConfig.title},
  description: SiteConfig.subtitle,
  openGraph: {
    ...openGraphBase('en'),
    title: SiteConfig.title,
    description: SiteConfig.subtitle,
    url: `${SiteConfig.url}/en`,
    images: [
      {
        url: buildOgImageUrl({
          title: SiteConfig.title,
          description: `${SiteConfig.subtitle}'s blog`,
          path: '/en',
          type: 'page',
        }),
        width: 1200,
        height: 630,
      },
    ],
  },
}
export default function EnPage() {
  return <HomeView locale="en" />
}
