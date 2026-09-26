import {getContactHref} from '@yceffort/shared/utils'

const isDev = process.env.NODE_ENV === 'development'

export const SiteConfig = {
  url: isDev ? 'http://localhost:3001' : 'https://research.yceffort.kr',
  title: 'yceffort 🧪',
  subtitle: 'research',
  postsPerPage: 6,
  googleAnalyticsId: 'G-ND58S24JBX',
  menu: [
    {label: 'Offline', path: '/offline'},
    {
      label: '📚 Blog',
      path: isDev ? 'http://localhost:3000' : 'https://yceffort.kr',
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
