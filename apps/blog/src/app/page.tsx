import type {Metadata} from 'next'

import Hero from '#components/HeroE'
import ListLayout from '#components/layouts/ListLayout'
import {SiteConfig} from '#src/config'
import {POPULAR_POSTS_COUNT} from '#src/constants'
import {getPopularPostSlugs} from '#utils/analytics'
import {getAllPosts} from '#utils/Post'

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

export default async function Page() {
  const allPosts = await getAllPosts()

  let displayPosts = allPosts.slice(0, POPULAR_POSTS_COUNT)
  let sectionTitle = 'Latest Posts'

  const popularSlugs = await getPopularPostSlugs(POPULAR_POSTS_COUNT)

  if (popularSlugs.length >= 3) {
    const popularPosts = popularSlugs
      .map((slug) => allPosts.find((p) => p.fields.slug === slug))
      .filter((p) => p !== undefined)

    if (popularPosts.length >= 3) {
      displayPosts = popularPosts
      sectionTitle = 'Popular Posts'
    }
  }

  return (
    <>
      <Hero />
      <ListLayout posts={displayPosts} title={sectionTitle} />
    </>
  )
}
