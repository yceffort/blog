import {Suspense} from 'react'

import type {Metadata} from 'next'

import InfiniteScrollList from '#components/InfiniteScrollList'
import {SiteConfig} from '#src/config'
import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'
import {getAllPosts} from '#utils/Post'

export const metadata: Metadata = {
  title: SiteConfig.title,
  description: SiteConfig.subtitle,
  openGraph: {
    title: SiteConfig.title,
    description: SiteConfig.subtitle,
    url: SiteConfig.url,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent(SiteConfig.title)}&description=${encodeURIComponent(`${SiteConfig.subtitle}'s blog`)}&path=${encodeURIComponent('/')}&type=page`,
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default async function Page() {
  const allPosts = await getAllPosts()

  // Strip body to reduce payload size - load first page of posts
  const posts = allPosts.slice(0, DEFAULT_NUMBER_OF_POSTS).map((post) => ({
    ...post,
    body: '',
  }))

  const uniqueKey =
    allPosts.length > 0
      ? `${allPosts[0].fields.slug}-${allPosts[0].frontMatter.date}`
      : ''

  return (
    <Suspense
      fallback={
        <div className="divide-y divide-gray-200 px-4 dark:divide-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length: DEFAULT_NUMBER_OF_POSTS}).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg border-2 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-gray-600 dark:bg-gray-800"
              >
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      }
    >
      <InfiniteScrollList posts={posts} uniqueKey={uniqueKey} />
    </Suspense>
  )
}
