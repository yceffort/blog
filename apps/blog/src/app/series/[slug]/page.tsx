import {EmphasizedTitle} from '@yceffort/shared/components'
import {notFound} from 'next/navigation'

import {PostArticle} from '@/components/PostArticle'
import RecentRow from '@/components/RecentRow'
import {SiteConfig} from '@/config'
import {buildOgImageUrl} from '@/utils/og'
import {findSeriesBySlug, getAllSeries} from '@/utils/Series'

export async function generateMetadata(props: {
  params: Promise<{slug: string}>
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
  return series.map(({slug}) => ({slug}))
}

export default async function SeriesDetailPage(props: {
  params: Promise<{slug: string}>
}) {
  const {slug} = await props.params
  const series = await findSeriesBySlug(slug)

  if (!series) {
    return notFound()
  }

  const {title, description, body, path, posts} = series

  return (
    <div className="page-view series-view">
      <section className="post-masthead">
        <div className="post-eyebrow">◆ SERIES · {posts.length} POSTS</div>
        <h1 className="post-title">
          <EmphasizedTitle title={title} />
        </h1>
        <p className="page-sub">{description}</p>
      </section>

      {body.trim() && (
        <div className="series-readme">
          <span className="series-nav-kicker">README</span>
          <PostArticle body={body} path={path} />
        </div>
      )}

      <div className="sec-head">
        <div>
          <span className="sec-count">
            {String(posts.length).padStart(2, '0')} ITEMS
          </span>
          <h2>전체 글</h2>
        </div>
        <div className="line" />
        <div className="hint">in order</div>
      </div>
      <section className="rec-list series-thread">
        {posts.map((post, i) => (
          <RecentRow key={post.fields.slug} post={post} index={i} />
        ))}
      </section>
    </div>
  )
}
