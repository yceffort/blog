import type {Metadata} from 'next'
import {notFound, permanentRedirect} from 'next/navigation'

import * as recentStyles from '@/components/home/recent.styles'
import RecentRow from '@/components/home/RecentRow'
import * as ambientStyles from '@/components/layout/ambient.styles'
import * as sectionStyles from '@/components/layout/section.styles'
import {EmphasizedTitle} from '@/components/post/EmphasizedTitle'
import {PostArticle} from '@/components/post/PostArticle'
import * as readingProgressStyles from '@/components/post/reading-progress.styles'
import * as seriesStyles from '@/components/series/series.styles'
import {SiteConfig} from '@/config'
import {buildOgImageUrl} from '@/utils/og'
import {resolveThumbnail, type Locale} from '@/utils/Post'
import {findSeriesBySlug, getAllSeries} from '@/utils/Series'

import '@/styles/reading.css'

const LABELS = {
  ko: {pathPrefix: '', allPosts: '전체 글'},
  en: {pathPrefix: '/en', allPosts: 'All posts'},
} as const

export async function seriesDetailMetadata(
  slug: string,
  locale: Locale,
): Promise<Metadata> {
  const series = await findSeriesBySlug(slug, locale)
  if (!series) {
    return {}
  }
  const {pathPrefix} = LABELS[locale]
  const hasEn = locale === 'en' || (await findSeriesBySlug(slug, 'en')) != null
  return {
    title: series.name,
    description: series.description,
    openGraph: {
      title: series.name,
      description: series.description,
      url: `${SiteConfig.url}${pathPrefix}/series/${slug}`,
      images: [
        {
          url: buildOgImageUrl({
            title: series.name,
            description: series.description,
            path: `${pathPrefix}/series/${slug}`,
            type: 'page',
            thumbnail: resolveThumbnail(`series/${slug}`),
          }),
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: `${SiteConfig.url}${pathPrefix}/series/${slug}`,
      ...(hasEn && {
        languages:
          locale === 'en'
            ? {ko: `${SiteConfig.url}/series/${slug}`}
            : {en: `${SiteConfig.url}/en/series/${slug}`},
      }),
    },
  }
}

export async function seriesStaticParams(locale: Locale) {
  const series = await getAllSeries(locale)
  return series.map(({slug}) => ({slug}))
}

export default async function SeriesDetailView({
  slug,
  locale,
}: {
  slug: string
  locale: Locale
}) {
  const series = await findSeriesBySlug(slug, locale)
  if (!series) {
    // 영문본이 한 편도 없는 시리즈는 한국어 시리즈 페이지로 보낸다
    if (locale === 'en' && (await findSeriesBySlug(slug))) {
      permanentRedirect(`/series/${slug}`)
    }
    return notFound()
  }
  const {pathPrefix, allPosts} = LABELS[locale]
  const {title, description, body, path, posts} = series
  return (
    <div className={`page-view series-view ${ambientStyles.page_view}`}>
      <section
        className={`post-masthead ${readingProgressStyles.post_masthead}`}
      >
        <div className={`post-eyebrow ${readingProgressStyles.post_eyebrow}`}>
          ◆ SERIES · {posts.length} POSTS
        </div>
        <h1 className={`post-title ${readingProgressStyles.post_title}`}>
          <EmphasizedTitle title={title} />
        </h1>
        <p className={`page-sub ${seriesStyles.description}`}>{description}</p>
      </section>

      {body.trim() && (
        <div className="series-readme">
          <span className="series-nav-kicker">README</span>
          <PostArticle body={body} path={path} />
        </div>
      )}

      <div className={`sec-head ${sectionStyles.sec_head}`}>
        <div>
          <span className={`sec-count ${sectionStyles.sec_count}`}>
            {String(posts.length).padStart(2, '0')} ITEMS
          </span>
          <h2 className={sectionStyles.element_h2}>{allPosts}</h2>
        </div>
        <div className={`line ${sectionStyles.line}`} />
        <div className={`hint ${sectionStyles.hint}`}>in order</div>
      </div>
      <section className={`rec-list series-thread ${recentStyles.rec_list}`}>
        {posts.map((post, i) => (
          <RecentRow
            key={post.fields.slug}
            post={post}
            index={i}
            variant="series"
            pathPrefix={pathPrefix}
          />
        ))}
      </section>
    </div>
  )
}
