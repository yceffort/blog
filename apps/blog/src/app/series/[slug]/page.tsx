import {notFound} from 'next/navigation'

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
import {resolveThumbnail} from '@/utils/Post'
import {findSeriesBySlug, getAllSeries} from '@/utils/Series'
export async function generateMetadata(props: {
  params: Promise<{
    slug: string
  }>
}) {
  const {slug} = await props.params
  const series = await findSeriesBySlug(slug)
  if (!series) {
    return {}
  }
  return {
    title: series.name,
    description: series.description,
    openGraph: {
      title: series.name,
      description: series.description,
      url: `${SiteConfig.url}/series/${slug}`,
      images: [
        {
          url: buildOgImageUrl({
            title: series.name,
            description: series.description,
            path: `/series/${slug}`,
            type: 'page',
            thumbnail: resolveThumbnail(`series/${slug}`),
          }),
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: `${SiteConfig.url}/series/${slug}`,
    },
  }
}
export async function generateStaticParams() {
  const series = await getAllSeries()
  return series.map(({slug}) => ({
    slug,
  }))
}
export default async function SeriesDetailPage(props: {
  params: Promise<{
    slug: string
  }>
}) {
  const {slug} = await props.params
  const series = await findSeriesBySlug(slug)
  if (!series) {
    return notFound()
  }
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
          <h2 className={sectionStyles.element_h2}>전체 글</h2>
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
          />
        ))}
      </section>
    </div>
  )
}
