import type {Metadata} from 'next'
import {cacheLife, cacheTag} from 'next/cache'
import {connection} from 'next/server'
import {Suspense} from 'react'

import Hero from '@/components/HeroE'
import PostCard from '@/components/PostCard'
import RecentRow from '@/components/RecentRow'
import {SiteConfig} from '@/config'
import {getAllPosts, getAllTagsFromPosts, getFeaturedPosts} from '@/utils/Post'

export const metadata: Metadata = {
  title: `${SiteConfig.title} — English`,
  description: SiteConfig.subtitle,
  openGraph: {
    title: `${SiteConfig.title} — English`,
    description: SiteConfig.subtitle,
    url: `${SiteConfig.url}/en`,
  },
}

async function getCachedEnHomeData() {
  'use cache'
  cacheLife('hours')
  cacheTag('home:en')

  return getEnHomeData()
}

async function getEnHomeData() {
  const [{popular, recent}, allPosts, tags] = await Promise.all([
    getFeaturedPosts('en'),
    getAllPosts('en'),
    getAllTagsFromPosts('en'),
  ])

  const postCount = allPosts.length
  const tagCount = tags.length
  const earliestYear = allPosts
    .map((p) => new Date(p.frontMatter.date).getFullYear())
    .reduce((a, b) => Math.min(a, b), new Date().getFullYear())
  const yearsWriting = Math.max(1, new Date().getFullYear() - earliestYear + 1)

  return {popular, recent, postCount, tagCount, yearsWriting}
}

export default function EnPage() {
  return (
    <Suspense>
      <EnHomeContent />
    </Suspense>
  )
}

async function EnHomeContent() {
  if (process.env.NODE_ENV !== 'production') {
    await connection()
  }
  const homeData =
    process.env.NODE_ENV === 'production'
      ? await getCachedEnHomeData()
      : await getEnHomeData()

  const {popular, recent, postCount, tagCount, yearsWriting} = homeData

  return (
    <div className="page-view">
      <Hero
        postCount={postCount}
        tagCount={tagCount}
        yearsWriting={yearsWriting}
      />

      <div className="sec-head">
        <div>
          <span className="sec-count">
            {String(popular.length).padStart(2, '0')} ITEMS
          </span>
          <h2>
            Popular <em>this season</em>
          </h2>
        </div>
        <div className="line" />
        <div className="hint">hover · tilt · open</div>
      </div>
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {popular.map((post) => (
          <PostCard key={post.fields.slug} post={post} pathPrefix="/en" />
        ))}
      </section>

      {recent.length > 0 && (
        <>
          <div className="sec-head">
            <div>
              <span className="sec-count">
                {String(recent.length).padStart(2, '0')} ITEMS
              </span>
              <h2>Recent</h2>
            </div>
            <div className="line" />
            <div className="hint">latest writing</div>
          </div>
          <section className="rec-list">
            {recent.map((post, i) => (
              <RecentRow
                key={post.fields.slug}
                post={post}
                index={i}
                pathPrefix="/en"
              />
            ))}
          </section>
        </>
      )}
    </div>
  )
}
