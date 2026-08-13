import {existsSync, watch} from 'node:fs'
import {utimes} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import type {NextConfig} from 'next'

const blogRoot = dirname(fileURLToPath(import.meta.url))
const postsDir = resolve(blogRoot, 'posts')
const postsModule = resolve(blogRoot, 'src/utils/Post.ts')

const globalWithPostWatcher = globalThis as typeof globalThis & {
  __blogPostWatcher?: ReturnType<typeof watch>
}

let postRefreshTimer: ReturnType<typeof setTimeout> | undefined

function isPostFile(filename: Buffer | string | null): boolean {
  return /\.mdx?$/.test(filename?.toString() ?? '')
}

function refreshPostModule() {
  clearTimeout(postRefreshTimer)
  postRefreshTimer = setTimeout(async () => {
    try {
      const now = new Date()
      await utimes(postsModule, now, now)
    } catch {
      // Keep Next dev running even if the filesystem notification fails.
    }
  }, 80)
}

function watchPostsInDevelopment() {
  if (globalWithPostWatcher.__blogPostWatcher || !existsSync(postsDir)) {
    return
  }

  globalWithPostWatcher.__blogPostWatcher = watch(
    postsDir,
    {recursive: true},
    (_event, filename) => {
      if (isPostFile(filename)) {
        refreshPostModule()
      }
    },
  )
}

if (process.env.NODE_ENV === 'development') {
  watchPostsInDevelopment()
}

const config: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      // 코드 생성 썸네일은 쿼리 스트링(v, slug, dpl)을 허용해야 한다
      {pathname: '/api/og/art'},
      {pathname: '/**', search: ''},
    ],
  },
  outputFileTracingIncludes: {
    '/*': ['./posts/**/*'],
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
  async rewrites() {
    return [
      {source: '/llms.txt', destination: '/api/llms'},
      {source: '/llms-full.txt', destination: '/api/llms-full'},
      {source: '/en/llms-full.txt', destination: '/api/llms-full/en'},
      {
        source: '/en/:year(\\d{4})/:slug*.md',
        destination: '/api/posts-raw/en/:year/:slug*',
      },
      {
        source: '/:year(\\d{4})/:slug*.md',
        destination: '/api/posts-raw/:year/:slug*',
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
      {
        source: '/ko',
        destination: '/',
        permanent: true,
      },
      {
        source: '/ko/:path*',
        destination: '/:path*',
        permanent: true,
      },
      {
        source: '/generate-screenshot',
        destination: '/2020/12/generate-serverless-thumbnail',
        permanent: true,
      },
      {
        source: '/',
        has: [{type: 'query', key: 'page', value: '(?<no>\\d+)'}],
        destination: '/pages/:no',
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
        destination: '/tags/:tag/pages/:no',
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
