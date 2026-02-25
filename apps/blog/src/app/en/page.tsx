import type {Metadata} from 'next'

import Hero from '#components/HeroE'
import ListLayout from '#components/layouts/ListLayout'
import {SiteConfig} from '#src/config'
import {POPULAR_POSTS_COUNT, RECENT_POSTS_COUNT} from '#src/constants'
import {getPopularPostSlugs} from '#utils/analytics'
import {getAllPosts} from '#utils/Post'

export const revalidate = 3600

export const metadata: Metadata = {
  title: `${SiteConfig.title} — English`,
  description: SiteConfig.subtitle,
  openGraph: {
    title: `${SiteConfig.title} — English`,
    description: SiteConfig.subtitle,
    url: `${SiteConfig.url}/en`,
  },
}

export default async function EnPage() {
  const [allPosts, popularSlugs] = await Promise.all([
    getAllPosts('en'),
    getPopularPostSlugs(POPULAR_POSTS_COUNT),
  ])

  let popular = popularSlugs
    .map((slug) => allPosts.find((p) => p.fields.slug === slug))
    .filter((p): p is NonNullable<typeof p> => p != null)

  if (popular.length === 0) {
    popular = allPosts.slice(0, POPULAR_POSTS_COUNT)
  }

  const shown = new Set(popular.map((p) => p.fields.slug))
  const recent = allPosts
    .filter((p) => !shown.has(p.fields.slug))
    .slice(0, RECENT_POSTS_COUNT)

  return (
    <>
      <Hero />
      <ListLayout posts={popular} title="Popular" pathPrefix="/en" />
      {recent.length > 0 && (
        <ListLayout posts={recent} title="Recent" pathPrefix="/en" />
      )}
    </>
  )
}
