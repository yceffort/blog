import Link from 'next/link'

import type {Metadata} from 'next'

import Hero from '#components/HeroE'
import ListLayout from '#components/layouts/ListLayout'
import {SiteConfig} from '#src/config'
import {POPULAR_POSTS_COUNT, RECENT_POSTS_COUNT} from '#src/constants'
import {getPopularPostSlugs} from '#utils/analytics'
import {getAllPosts} from '#utils/Post'

import type {Post} from '#src/type'

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
        url: `/api/og?title=${encodeURIComponent(SiteConfig.title)}&description=${encodeURIComponent(`${SiteConfig.subtitle}'s blog`)}&path=${encodeURIComponent('/')}&type=page`,
        width: 1200,
        height: 630,
      },
    ],
  },
}

function FeaturedCard({post}: {post: Post}) {
  const {
    fields: {slug},
    frontMatter: {title, description, tags},
  } = post

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-3xl font-black leading-9 tracking-tight text-black dark:text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
        Featured
      </h2>
      <Link
        href={`/${slug}`}
        className="group block rounded-xl border-2 border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100 p-6 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:from-primary-950/50 dark:to-primary-900/30"
      >
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="border border-black bg-white px-3 py-1 text-xs font-bold uppercase text-black dark:border-white dark:bg-gray-800 dark:text-white"
            >
              {tag.split(' ').join('-')}
            </span>
          ))}
        </div>
        <h3 className="text-xl font-black leading-tight tracking-tight text-black dark:text-white md:text-2xl">
          {title}
        </h3>
        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-2">
          {description}
        </p>
        <span className="mt-4 inline-flex items-center gap-1 text-base font-black text-primary-600 dark:text-primary-400">
          Read more
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </span>
      </Link>
    </div>
  )
}

export default async function Page() {
  const [allPosts, popularSlugs] = await Promise.all([
    getAllPosts(),
    getPopularPostSlugs(POPULAR_POSTS_COUNT),
  ])

  const featuredPosts = allPosts.filter((p) => p.frontMatter.featured)

  let posts = popularSlugs
    .map((slug) => allPosts.find((p) => p.fields.slug === slug))
    .filter((p): p is NonNullable<typeof p> => p != null)

  if (posts.length === 0) {
    posts = allPosts.slice(0, POPULAR_POSTS_COUNT)
  }

  const shown = new Set([
    ...featuredPosts.map((p) => p.fields.slug),
    ...posts.map((p) => p.fields.slug),
  ])
  const recentPosts = allPosts.filter((p) => !shown.has(p.fields.slug)).slice(0, RECENT_POSTS_COUNT)

  return (
    <>
      <Hero />
      {featuredPosts.length > 0 && <FeaturedCard post={featuredPosts[0]} />}
      <ListLayout posts={posts} title="Popular" />
      {recentPosts.length > 0 && <ListLayout posts={recentPosts} title="Recent" />}
    </>
  )
}
