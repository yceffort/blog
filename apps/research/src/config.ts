import {getContactHref} from '@yceffort/shared/utils'

const isDev = process.env.NODE_ENV === 'development'

export const SiteConfig = {
  url: isDev ? 'http://localhost:3001' : 'https://research.yceffort.kr',
  title: 'yceffort research',
  subtitle: 'research',
  postsPerPage: 6,
  googleAnalyticsId: 'G-ND58S24JBX',
  menu: [
    {label: 'Offline', path: '/offline'},
    {
      label: 'Blog',
      path: isDev ? 'http://localhost:3000' : 'https://yceffort.kr',
    },
    {
      label: 'News',
      path: isDev ? 'http://localhost:3003' : 'https://news.yceffort.kr',
    },
  ],
  author: {
    name: 'yceffort',
    contacts: {
      email: 'root@yceffort.kr',
      twitter: getContactHref('twitter', 'yceffort_dev'),
      github: getContactHref('github', 'yceffort'),
    },
  },
}

// Next 메타데이터는 얕게 병합되어 페이지가 openGraph를 정의하면 layout의 openGraph가 통째로 덮인다.
// 그래서 openGraph를 정의하는 페이지마다 이 값을 펼쳐 넣는다.
export const openGraphBase = {
  siteName: SiteConfig.title,
  locale: 'ko_KR',
  type: 'website' as const,
}
