import getContactHref from '#utils/Contact'

const isDev = process.env.NODE_ENV === 'development'

export const SiteConfig = {
  url: isDev ? 'http://localhost:3000' : 'https://yceffort.kr',
  pathPrefix: '/',
  title: 'yceffort',
  subtitle: 'Grind. Learn. Repeat.',
  copyright: 'yceffort © All rights reserved.',
  disqusShortname: '',
  postsPerPage: 5,
  googleAnalyticsId: 'G-ND58S24JBX',
  useKatex: false,
  menu: [
    {
      label: 'Posts',
      path: '/pages/1',
    },
    {
      label: 'Tags',
      path: '/tags',
    },
    {
      label: 'About',
      path: '/about',
    },
    {
      label: '🧪 Research',
      path: isDev ? 'http://localhost:3001' : 'https://research.yceffort.kr',
    },
  ],
  author: {
    name: 'yceffort',
    photo: '/profile.jpeg',
    bio: 'frontend engineer',
    contacts: {
      email: 'root@yceffort.kr',
      facebook: '',
      telegram: '',
      twitter: getContactHref('twitter', 'yceffort_dev'),
      github: getContactHref('github', 'yceffort'),
      rss: '',
      linkedin: '',
      instagram: '',
      line: '',
      gitlab: '',
      codepen: '',
      youtube: '',
      soundcloud: '',
    },
  },
}
