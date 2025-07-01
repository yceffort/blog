import getContactHref from '#utils/Contact'

export const SiteConfig = {
  url: 'https://yceffort.kr',
  pathPrefix: '/',
  title: 'yceffort',
  subtitle: 'yceffort',
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
      label: 'about',
      path: '/about',
    },
    {
      label: 'resume',
      path: '/resume',
    },
    {
      label: '🧪 Research',
      path: 'https://research.yceffort.kr',
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
