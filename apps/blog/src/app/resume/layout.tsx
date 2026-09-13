import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import {SiteConfig} from '@/config'
import {buildOgImageUrl} from '@/utils/og'

const description =
  '프론트엔드 엔지니어 yceffort의 경력과 기여. 서비스 개발과 운영, 팀의 공통 개발 기반 구축, 저술·번역과 오픈소스 활동을 소개합니다.'

export const metadata: Metadata = {
  title: 'Resume - ' + SiteConfig.title,
  description,
  openGraph: {
    title: 'Resume - ' + SiteConfig.title,
    description,
    url: `${SiteConfig.url}/resume`,
    images: [
      {
        url: buildOgImageUrl({
          title: 'Resume - ' + SiteConfig.title,
          description,
          path: '/resume',
          type: 'page',
        }),
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: {
    canonical: `${SiteConfig.url}/resume`,
  },
}

export default function Layout({children}: {children: ReactNode}) {
  return <>{children}</>
}
