import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  async rewrites() {
    return [
      {source: '/slides/:slug.md', destination: '/api/slides/:slug/raw'},
      {source: '/llms.txt', destination: '/api/llms'},
      {source: '/llms-full.txt', destination: '/api/llms-full'},
      // public/lab 아래 정적 데모를 디렉터리 경로로도 연다
      {source: '/lab/:dir', destination: '/lab/:dir/index.html'},
    ]
  },
}

export default nextConfig
