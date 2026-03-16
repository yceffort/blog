import type {Metadata} from 'next'

import Hero from '@/components/HeroE'
import ListLayout from '@/components/layouts/ListLayout'
import {SiteConfig} from '@/config'
import {POPULAR_POSTS_COUNT, RECENT_POSTS_COUNT} from '@/constants'
import {getPopularPostSlugs} from '@/utils/analytics'
import {buildOgImageUrl} from '@/utils/og'
import {getAllPosts} from '@/utils/Post'

export const revalidate = 3600

export const metadata: Metadata = {
  title: SiteConfig.title,
  description: SiteConfig.subtitle,
  openGraph: {
    title: SiteConfig.title,
    description: SiteConfig.subtitle,
    url: SiteConfig.url,
    images: [
      {
        url: buildOgImageUrl({
          title: SiteConfig.title,
          description: `${SiteConfig.subtitle}'s blog`,
          path: '/',
          type: 'page',
        }),
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default async function Page() {
  const [allPosts, popularSlugs] = await Promise.all([
    getAllPosts(),
    getPopularPostSlugs(POPULAR_POSTS_COUNT),
  ])

  const posts = popularSlugs
    .map((slug) => allPosts.find((p) => p.fields.slug === slug))
    .filter((p): p is NonNullable<typeof p> => p != null)

  if (posts.length < POPULAR_POSTS_COUNT) {
    const slugSet = new Set(posts.map((p) => p.fields.slug))
    for (const p of allPosts) {
      if (posts.length >= POPULAR_POSTS_COUNT) {break}
      if (!slugSet.has(p.fields.slug)) {
        posts.push(p)
        slugSet.add(p.fields.slug)
      }
    }
  }

  const shown = new Set(posts.map((p) => p.fields.slug))
  const recentPosts = allPosts
    .filter((p) => !shown.has(p.fields.slug))
    .slice(0, RECENT_POSTS_COUNT)

  return (
    <>
      <Hero />
      <ListLayout posts={posts} title="Popular" />
      {recentPosts.length > 0 && (
        <ListLayout posts={recentPosts} title="Recent" />
      )}
    </>
  )
}
