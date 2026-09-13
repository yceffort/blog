import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import {SiteConfig} from '@/config'
import {buildOgImageUrl} from '@/utils/og'

const description =
  '프론트엔드 엔지니어 yceffort. 웹의 동작 원리와 성능, 개발 도구, AI 시대의 판단과 학습을 탐구하며 글과 책, 오픈소스로 경험을 나눕니다.'

export const metadata: Metadata = {
  title: 'About - ' + SiteConfig.title,
  description,
  openGraph: {
    title: 'About - ' + SiteConfig.title,
    description,
    url: `${SiteConfig.url}/about`,
    images: [
      {
        url: buildOgImageUrl({
          title: 'About - ' + SiteConfig.title,
          description,
          path: '/about',
          type: 'page',
        }),
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: `${SiteConfig.url}/about`,
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return <>{children}</>
}
