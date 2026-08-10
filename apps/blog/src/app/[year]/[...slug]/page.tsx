import {parseTitleEmphasis, stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'
import {cacheLife, cacheTag} from 'next/cache'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import Script from 'next/script'
import {connection} from 'next/server'
import {ViewTransition} from 'react'

import MathLoader from '@/components/layouts/Post/math'
import {PostArticle} from '@/components/PostArticle'
import ProfileImage from '@/components/ProfileImage'
import RelatedPosts from '@/components/RelatedPosts'
import SeriesNavigation from '@/components/SeriesNavigation'
import SeriesPrevNext from '@/components/SeriesPrevNext'
import SubscribeCta from '@/components/SubscribeCta'
import TableOfContents from '@/components/TableOfContents'
import Tag from '@/components/Tag'
import {SiteConfig} from '@/config'
import {buildBlogPostingJsonLd, buildBreadcrumbJsonLd} from '@/utils/jsonLd'
import {buildOgImageUrl} from '@/utils/og'
import {
  findPostByYearAndSlug,
  getFeaturedSlugs,
  getRelatedPosts,
  getSeriesPosts,
} from '@/utils/Post'
import {findSeriesSlugByName} from '@/utils/Series'

export async function generateMetadata(props: {
  params: Promise<{year: string; slug: string[]}>
}) {
  const params = await props.params

  const {year, slug} = params

  const post = await findPostByYearAndSlug(year, slug)

  if (!post) {
    return {}
  }

  const enPost = await findPostByYearAndSlug(year, slug, 'en')
  const plainTitle = stripTitleEmphasis(post.frontMatter.title)

  return {
    title: plainTitle,
    description: post.frontMatter.description,
    openGraph: {
      title: plainTitle,
      description: post.frontMatter.description,
      url: `${SiteConfig.url}/${post.fields.slug}`,
      images: [
        {
          url: buildOgImageUrl({
            title: plainTitle,
            description: post.frontMatter.description,
            tags: post.frontMatter.tags,
            path: '/' + post.fields.slug,
            thumbnail: post.frontMatter.thumbnail,
          }),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: plainTitle,
      description: post.frontMatter.description,
    },
    alternates: {
      canonical: `${SiteConfig.url}/${post.fields.slug}`,
      ...(enPost && {
        languages: {
          en: `${SiteConfig.url}/en/${post.fields.slug}`,
        },
      }),
      types: {
        'text/markdown': `${SiteConfig.url}/${post.fields.slug}.md`,
      },
    },
  }
}

export async function generateStaticParams() {
  const slugs = await getFeaturedSlugs('ko')
  return slugs.map((slug) => {
    const [year, ...rest] = slug.split('/')
    return {year, slug: rest}
  })
}

export default async function Page(props: {
  params: Promise<{year: string; slug: string[]}>
}) {
  const params = await props.params
  const {year, slug} = params

  const post = await findPostByYearAndSlug(year, slug)
  if (!post) {
    return notFound()
  }

  if (process.env.NODE_ENV !== 'production') {
    await connection()
    return <PostBody year={year} slug={slug} />
  }

  return <CachedPostBody year={year} slug={slug} />
}

async function CachedPostBody({year, slug}: {year: string; slug: string[]}) {
  'use cache'
  cacheLife('max')
  cacheTag(`post:ko/${year}/${slug.join('/')}`)

  return <PostBody year={year} slug={slug} />
}

async function PostBody({year, slug}: {year: string; slug: string[]}) {
  const post = await findPostByYearAndSlug(year, slug)
  if (!post) {
    return null
  }

  const {
    frontMatter: {title, tags, date, description, series, published},
    body,
    path,
    fields: {slug: postSlug},
    readingTime,
  } = post

  const seriesPosts = series ? await getSeriesPosts(series) : []
  const seriesSlug = series ? await findSeriesSlugByName(series) : undefined
  const relatedPosts = await getRelatedPosts(postSlug, tags, 'ko', series)

  const updatedAt = format(new Date(date), 'yyyy-MM-dd')
  const transitionName = `post-${postSlug.replace(/\//g, '-')}`
  const plainTitle = stripTitleEmphasis(title)
  const link = `https://github.com/yceffort/yceffort-blog-v2/issues/new?labels=%F0%9F%92%AC%20Discussion&title=[Discussion] issue on ${plainTitle}&assignees=yceffort&body=${SiteConfig.url}/${postSlug}`

  const thumbnail = post.frontMatter.thumbnail
  const ogImageUrl = buildOgImageUrl({
    title: plainTitle,
    description,
    tags,
    path: '/' + postSlug,
    thumbnail,
  })

  const postYear = new Date(date).getFullYear()

  const postUrl = `${SiteConfig.url}/${postSlug}`
  const jsonLd = [
    buildBlogPostingJsonLd({
      title: plainTitle,
      description,
      date,
      tags,
      imageUrl: `${SiteConfig.url}${ogImageUrl}`,
      url: postUrl,
      inLanguage: 'ko-KR',
    }),
    buildBreadcrumbJsonLd([
      {name: 'Home', url: SiteConfig.url},
      {name: `${postYear}`, url: `${SiteConfig.url}/archive#${postYear}`},
      {name: plainTitle, url: postUrl},
    ]),
  ]

  const titleParts = parseTitleEmphasis(title)

  return (
    <>
      <Script
        id={`jsonld-${postSlug.replace(/\//g, '-')}`}
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <MathLoader />
      <div className="page-view relative">
        <Link href="/" className="post-back">
          <span className="dot">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M15 18 9 12l6-6" />
            </svg>
          </span>
          BACK TO INDEX
        </Link>

        <section className="post-masthead">
          {!published && (
            <div className="mb-3 inline-block rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow">
              Draft
            </div>
          )}
          <div className="post-eyebrow">
            ◆{' '}
            {series ? (
              seriesSlug ? (
                <Link href={`/series/${seriesSlug}`}>SERIES · {series}</Link>
              ) : (
                `SERIES · ${series}`
              )
            ) : (
              'ESSAY'
            )}
          </div>
          <ViewTransition name={transitionName}>
            <h1 className="post-title">
              {titleParts.map((part, i) =>
                part.emphasis ? <em key={i}>{part.text}</em> : part.text,
              )}
            </h1>
          </ViewTransition>
          <div className="post-meta-row">
            <div className="post-author">
              <ProfileImage
                size={36}
                transitionName={`${transitionName}-avatar`}
              />
              <div>
                <div className="nm">{SiteConfig.author.name}</div>
                <div className="sub">
                  {updatedAt} · {readingTime}분
                </div>
              </div>
            </div>
            <div className="post-stats">
              <div>
                <b>{readingTime}</b>min
              </div>
              <div>
                <b>{postYear}</b>year
              </div>
              <div>
                <b>KO</b>original
              </div>
            </div>
          </div>
          {tags && (
            <ViewTransition name={`${transitionName}-tags`}>
              <div className="post-tags-row">
                {tags.slice(0, 5).map((tag) => (
                  <Tag key={tag} text={tag} />
                ))}
              </div>
            </ViewTransition>
          )}
        </section>

        {series && seriesPosts.length > 1 && (
          <SeriesNavigation
            seriesName={series}
            seriesSlug={seriesSlug}
            seriesPosts={seriesPosts}
            currentSlug={postSlug}
          />
        )}

        <PostArticle body={body} path={path} />

        {series && seriesPosts.length > 1 && (
          <SeriesPrevNext seriesPosts={seriesPosts} currentSlug={postSlug} />
        )}

        <RelatedPosts posts={relatedPosts} title="관련 글" />

        <SubscribeCta />

        <footer className="post-footer">
          <Link href="/">&larr; Back to the blog</Link>
          <Link href={link} className="issue">
            Issue on GitHub →
          </Link>
        </footer>
      </div>
      <TableOfContents />
    </>
  )
}
