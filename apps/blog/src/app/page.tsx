import type {Metadata} from 'next'
import {cacheLife, cacheTag} from 'next/cache'
import Link from 'next/link'
import {connection} from 'next/server'
import {Suspense} from 'react'

import Hero from '@/components/HeroE'
import PopularSeriesCard from '@/components/PopularSeriesCard'
import PostCard from '@/components/PostCard'
import RecentRow from '@/components/RecentRow'
import SeriesRow from '@/components/SeriesRow'
import {SiteConfig} from '@/config'
import {buildOgImageUrl} from '@/utils/og'
import {
  buildArtThumbnail,
  getAllPosts,
  getAllTagsFromPosts,
  getFeaturedPosts,
} from '@/utils/Post'
import {getAllSeries, getPopularSeries} from '@/utils/Series'

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

async function getCachedHomeData() {
  'use cache'
  cacheLife('hours')
  cacheTag('home:ko')

  return getHomeData()
}

async function getHomeData() {
  const popularSeries = await getPopularSeries('ko')
  const [{popular: posts, recent: recentPosts}, allPosts, tags, series] =
    await Promise.all([
      getFeaturedPosts('ko', popularSeries ? 1 : 0),
      getAllPosts('ko'),
      getAllTagsFromPosts('ko'),
      getAllSeries('ko'),
    ])

  const postCount = allPosts.length
  const tagCount = tags.length
  const currentYear = new Date().getFullYear()
  const earliestYear = allPosts
    .map((p) => new Date(p.frontMatter.date).getFullYear())
    .reduce((a, b) => Math.min(a, b), currentYear)
  const yearsWriting = Math.max(1, currentYear - earliestYear + 1)

  return {
    posts,
    recentPosts,
    series,
    popularSeries,
    postCount,
    tagCount,
    yearsWriting,
  }
}

export default function Page() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}

async function HomeContent() {
  if (process.env.NODE_ENV !== 'production') {
    await connection()
  }
  const homeData =
    process.env.NODE_ENV === 'production'
      ? await getCachedHomeData()
      : await getHomeData()

  const {
    posts,
    recentPosts,
    series,
    popularSeries,
    postCount,
    tagCount,
    yearsWriting,
  } = homeData

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
            {String(posts.length + (popularSeries ? 1 : 0)).padStart(2, '0')}{' '}
            ITEMS
          </span>
          <h2>
            Popular <em>this season</em>
          </h2>
        </div>
        <div className="line" />
        <div className="hint">hover · tilt · open</div>
      </div>
      <section className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <PostCard
            key={post.fields.slug}
            post={post}
            badge="인기 포스트"
            priority={i < 3}
          />
        ))}
        {popularSeries && (
          <PopularSeriesCard
            series={popularSeries}
            thumbnail={buildArtThumbnail(`series/${popularSeries.slug}`)}
          />
        )}
      </section>

      {series.length > 0 && (
        <>
          <div className="sec-head">
            <div>
              <span className="sec-count">
                {String(series.length).padStart(2, '0')} ITEMS
              </span>
              <h2>
                Series <em>one thread</em>
              </h2>
            </div>
            <div className="line" />
            <div className="hint">
              <Link href="/series">view all →</Link>
            </div>
          </div>
          <section className="rec-list">
            {series.map((s, i) => (
              <SeriesRow key={s.slug} series={s} index={i} />
            ))}
          </section>
        </>
      )}

      {recentPosts.length > 0 && (
        <>
          <div className="sec-head">
            <div>
              <span className="sec-count">
                {String(recentPosts.length).padStart(2, '0')} ITEMS
              </span>
              <h2>Recent</h2>
            </div>
            <div className="line" />
            <div className="hint">latest writing</div>
          </div>
          <section className="rec-list">
            {recentPosts.map((post, i) => (
              <RecentRow key={post.fields.slug} post={post} index={i} />
            ))}
          </section>
        </>
      )}
    </div>
  )
}
