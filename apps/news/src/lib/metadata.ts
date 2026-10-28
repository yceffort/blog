import {buildOgImageUrl} from '@yceffort/shared/utils'
import type {Metadata} from 'next'

import {SiteConfig} from '@/config'

// Next 메타데이터는 얕게 병합되어 페이지가 openGraph를 정의하면 layout의 openGraph가 통째로 덮인다.
// 그래서 사이트 공통 값까지 여기서 함께 채운다.
export function pageMetadata({
  title,
  description = SiteConfig.description,
  path,
}: {
  title: string
  description?: string
  path: string
}): Metadata {
  const url = `${SiteConfig.url}${path}`
  return {
    title,
    description,
    alternates: {canonical: url},
    openGraph: {
      siteName: SiteConfig.title,
      locale: 'ko_KR',
      type: 'website',
      title,
      description,
      url,
      images: [
        {
          url: buildOgImageUrl({title, description, path}),
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}
