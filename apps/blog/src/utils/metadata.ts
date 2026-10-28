import {SiteConfig} from '@/config'
import type {Locale} from '@/utils/postPaths'

// Next 메타데이터는 얕게 병합되어 페이지가 openGraph를 정의하면 layout의 openGraph가 통째로 덮인다.
// 그래서 openGraph를 정의하는 페이지마다 이 값을 펼쳐 넣는다.
export function openGraphBase(locale: Locale) {
  return {
    siteName: SiteConfig.title,
    locale: locale === 'en' ? 'en_US' : 'ko_KR',
    type: 'website' as const,
  }
}
