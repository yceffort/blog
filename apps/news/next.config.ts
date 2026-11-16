import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/api/og': ['../../packages/shared/src/og/fonts/*.ttf'],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {key: 'Service-Worker-Allowed', value: '/'},
          {key: 'Cache-Control', value: 'no-cache'},
        ],
      },
    ]
  },
}

export default nextConfig
