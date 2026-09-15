import * as stylex from '@stylexjs/stylex'
import type {Metadata} from 'next'
import {cacheLife, cacheTag} from 'next/cache'
import Link from 'next/link'
import {connection} from 'next/server'
import {Suspense} from 'react'

import Hero from '@/components/home/HeroE'
import * as recentStyles from '@/components/home/recent.styles'
import RecentRow from '@/components/home/RecentRow'
import * as ambientStyles from '@/components/layout/ambient.styles'
import * as sectionStyles from '@/components/layout/section.styles'
import PostCard from '@/components/post/PostCard'
import PopularSeriesCard from '@/components/series/PopularSeriesCard'
import SeriesRow from '@/components/series/SeriesRow'
import {SiteConfig} from '@/config'
import {HOME_SERIES_COUNT} from '@/constants'
import {buildOgImageUrl} from '@/utils/og'
import {
  resolveThumbnail,
  getAllPosts,
  getAllTagsFromPosts,
  getFeaturedPosts,
} from '@/utils/Post'
import {getAllSeries, getPopularSeries} from '@/utils/Series'
const sx = stylex.create({
  section: {
    '@layer utilities': {
      display: 'grid',
      gridTemplateColumns: {
        default: 'repeat(1, minmax(0, 1fr))',
        '@media (width >= 48rem)': 'repeat(2, minmax(0, 1fr))',
        '@media (width >= 64rem)': 'repeat(3, minmax(0, 1fr))',
      },
      gap: 'calc(var(--spacing) * 8)',
    },
  },
})
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
  const popularSeriesThumbnail =
    popularSeries && resolveThumbnail(`series/${popularSeries.slug}`)
  return (
    <div className={`page-view ${ambientStyles.page_view}`}>
      <Hero
        postCount={postCount}
        tagCount={tagCount}
        yearsWriting={yearsWriting}
      />

      <div className={`sec-head ${sectionStyles.sec_head}`}>
        <div>
          <span className={`sec-count ${sectionStyles.sec_count}`}>
            {String(posts.length + (popularSeries ? 1 : 0)).padStart(2, '0')}{' '}
            ITEMS
          </span>
          <h2 className={sectionStyles.element_h2}>
            {'Popular '}
            <em className={sectionStyles.element_em}>this season</em>
          </h2>
        </div>
        <div className={`line ${sectionStyles.line}`} />
        <div className={`hint ${sectionStyles.hint}`}>hover · tilt · open</div>
      </div>
      <section className={stylex.props(sx.section).className}>
        {posts.map((post, i) => (
          <PostCard
            key={post.fields.slug}
            post={post}
            badge="인기 포스트"
            priority={i < 3}
          />
        ))}
        {popularSeries && popularSeriesThumbnail && (
          <PopularSeriesCard
            series={popularSeries}
            thumbnail={popularSeriesThumbnail}
          />
        )}
      </section>

      {series.length > 0 && (
        <>
          <div className={`sec-head ${sectionStyles.sec_head}`}>
            <div>
              <span className={`sec-count ${sectionStyles.sec_count}`}>
                {String(series.length).padStart(2, '0')} ITEMS
              </span>
              <h2 className={sectionStyles.element_h2}>
                {'Series '}
                <em className={sectionStyles.element_em}>one thread</em>
              </h2>
            </div>
            <div className={`line ${sectionStyles.line}`} />
            <div className={`hint ${sectionStyles.hint}`}>
              <Link href="/series">view all →</Link>
            </div>
          </div>
          <section className={`rec-list ${recentStyles.rec_list}`}>
            {series.slice(0, HOME_SERIES_COUNT).map((s, i) => (
              <SeriesRow key={s.slug} series={s} index={i} />
            ))}
          </section>
        </>
      )}

      {recentPosts.length > 0 && (
        <>
          <div className={`sec-head ${sectionStyles.sec_head}`}>
            <div>
              <span className={`sec-count ${sectionStyles.sec_count}`}>
                {String(recentPosts.length).padStart(2, '0')} ITEMS
              </span>
              <h2 className={sectionStyles.element_h2}>Recent</h2>
            </div>
            <div className={`line ${sectionStyles.line}`} />
            <div className={`hint ${sectionStyles.hint}`}>latest writing</div>
          </div>
          <section className={`rec-list ${recentStyles.rec_list}`}>
            {recentPosts.map((post, i) => (
              <RecentRow key={post.fields.slug} post={post} index={i} />
            ))}
          </section>
        </>
      )}
    </div>
  )
}
