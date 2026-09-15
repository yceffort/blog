import * as stylex from '@stylexjs/stylex'
import type {Metadata} from 'next'
import {cacheLife, cacheTag} from 'next/cache'
import {connection} from 'next/server'
import {Suspense} from 'react'

import Hero from '@/components/home/HeroE'
import * as recentStyles from '@/components/home/recent.styles'
import RecentRow from '@/components/home/RecentRow'
import * as ambientStyles from '@/components/layout/ambient.styles'
import * as sectionStyles from '@/components/layout/section.styles'
import PostCard from '@/components/post/PostCard'
import {SiteConfig} from '@/config'
import {getAllPosts, getAllTagsFromPosts, getFeaturedPosts} from '@/utils/Post'
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
  return {
    popular,
    recent,
    postCount,
    tagCount,
    yearsWriting,
  }
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
    <div className={`page-view ${ambientStyles.page_view}`}>
      <Hero
        postCount={postCount}
        tagCount={tagCount}
        yearsWriting={yearsWriting}
      />

      <div className={`sec-head ${sectionStyles.sec_head}`}>
        <div>
          <span className={`sec-count ${sectionStyles.sec_count}`}>
            {String(popular.length).padStart(2, '0')} ITEMS
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
        {popular.map((post, i) => (
          <PostCard
            key={post.fields.slug}
            post={post}
            pathPrefix="/en"
            priority={i < 3}
          />
        ))}
      </section>

      {recent.length > 0 && (
        <>
          <div className={`sec-head ${sectionStyles.sec_head}`}>
            <div>
              <span className={`sec-count ${sectionStyles.sec_count}`}>
                {String(recent.length).padStart(2, '0')} ITEMS
              </span>
              <h2 className={sectionStyles.element_h2}>Recent</h2>
            </div>
            <div className={`line ${sectionStyles.line}`} />
            <div className={`hint ${sectionStyles.hint}`}>latest writing</div>
          </div>
          <section className={`rec-list ${recentStyles.rec_list}`}>
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
