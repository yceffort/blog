import type {NextConfig} from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    viewTransition: true,
  },
  outputFileTracingIncludes: {
    '/*': ['./posts/**/*'],
  },
  async redirects() {
    return [
      {
        source: '/',
        has: [{type: 'query', key: 'page', value: '(?<page>\\d+)'}],
        destination: '/pages/:page',
        permanent: true,
      },
      {
        source: '/tag/:tag',
        destination: '/tags/:tag/pages/1',
        permanent: true,
      },
      {
        source: '/tag/:tag/page/:no',
        destination: '/tags/:tag/pages/:no',
        permanent: true,
      },
      {
        source: '/tags/:tag/pages/((?!\\d).*)',
        destination: '/tags/:tag/pages/1',
        permanent: true,
      },
      {
        source: '/tags/:tag',
        destination: '/tags/:tag/pages/1',
        permanent: true,
      },
      {
        source: '/category/:tag',
        destination: '/tags/:tag/pages/1',
        permanent: true,
      },
      {
        source: '/category/:tag/page/:no',
        destination: '/tags/:tag/page/:no',
        permanent: true,
      },
      {
        source: '/categories',
        destination: '/tags',
        permanent: true,
      },
    ]
  },
}

export default config
