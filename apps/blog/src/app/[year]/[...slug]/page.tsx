import * as stylex from '@stylexjs/stylex'
import {parseTitleEmphasis, stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'
import {cacheLife, cacheTag} from 'next/cache'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import Script from 'next/script'
import {connection} from 'next/server'
import {ViewTransition} from 'react'

import * as ambientStyles from '@/components/layout/ambient.styles'
import MathLoader from '@/components/post/math'
import {PostArticle} from '@/components/post/PostArticle'
import ProfileImage from '@/components/post/ProfileImage'
import * as readingProgressStyles from '@/components/post/reading-progress.styles'
import RelatedPosts from '@/components/post/RelatedPosts'
import SubscribeCta from '@/components/post/SubscribeCta'
import TableOfContents from '@/components/post/TableOfContents'
import Tag from '@/components/post/Tag'
import SeriesNavigation from '@/components/series/SeriesNavigation'
import SeriesPrevNext from '@/components/series/SeriesPrevNext'
import {SiteConfig} from '@/config'
import {buildBlogPostingJsonLd, buildBreadcrumbJsonLd} from '@/utils/jsonLd'
import {buildOgImageUrl} from '@/utils/og'
import {
  findPostByYearAndSlug,
  getPrerenderSlugs,
  getRelatedPosts,
  getSeriesPosts,
} from '@/utils/Post'
import {findSeriesSlugByName} from '@/utils/Series'
const sx = stylex.create({
  div: {
    '@layer utilities': {
      position: 'relative',
    },
  },
  div2: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 3)',
      display: 'inline-block',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-amber-500)',
      paddingInline: 'calc(var(--spacing) * 2)',
      paddingBlock: 'calc(var(--spacing) * 0.5)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-white)',
      textTransform: 'uppercase',
      '--blog-shadow':
        '0 1px 3px 0 var(--blog-shadow-color, rgb(0 0 0 / 0.1)), 0 1px 2px -1px var(--blog-shadow-color, rgb(0 0 0 / 0.1))',
      boxShadow:
        'var(--blog-inset-shadow), var(--blog-inset-ring-shadow), var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
    },
  },
})
export async function generateMetadata(props: {
  params: Promise<{
    year: string
    slug: string[]
  }>
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
  const slugs = await getPrerenderSlugs('ko')
  return slugs.map((slug) => {
    const [year, ...rest] = slug.split('/')
    return {
      year,
      slug: rest,
    }
  })
}
export default async function Page(props: {
  params: Promise<{
    year: string
    slug: string[]
  }>
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
    frontMatter: {title, tags, date, description, series, published, slide},
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
      {
        name: 'Home',
        url: SiteConfig.url,
      },
      {
        name: `${postYear}`,
        url: `${SiteConfig.url}/archive#${postYear}`,
      },
      {
        name: plainTitle,
        url: postUrl,
      },
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
      <div
        className={`page-view ${ambientStyles.page_view} ${stylex.props(sx.div).className}`}
      >
        <Link
          href="/"
          className={`post-back ${readingProgressStyles.post_back}`}
        >
          <span className={`dot ${readingProgressStyles.dot}`}>
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

        <section
          className={`post-masthead ${readingProgressStyles.post_masthead}`}
        >
          {!published && (
            <div className={stylex.props(sx.div2).className}>Draft</div>
          )}
          <div className={`post-eyebrow ${readingProgressStyles.post_eyebrow}`}>
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
            <h1 className={`post-title ${readingProgressStyles.post_title}`}>
              {titleParts.map((part, i) =>
                part.emphasis ? (
                  <em key={i} className={readingProgressStyles.title_em}>
                    {part.text}
                  </em>
                ) : (
                  part.text
                ),
              )}
            </h1>
          </ViewTransition>
          <div
            className={`post-meta-row ${readingProgressStyles.post_meta_row}`}
          >
            <div className={`post-author ${readingProgressStyles.post_author}`}>
              <ProfileImage
                size={36}
                transitionName={`${transitionName}-avatar`}
              />
              <div>
                <div className={`nm ${readingProgressStyles.nm}`}>
                  {SiteConfig.author.name}
                </div>
                <div className={`sub ${readingProgressStyles.sub}`}>
                  {updatedAt} · {readingTime}분
                </div>
              </div>
            </div>
            <div className={`post-stats ${readingProgressStyles.post_stats}`}>
              <div>
                <b className={readingProgressStyles.element_b}>{readingTime}</b>
                min
              </div>
              <div>
                <b className={readingProgressStyles.element_b}>{postYear}</b>
                year
              </div>
              <div>
                <b className={readingProgressStyles.element_b}>KO</b>
                original
              </div>
            </div>
          </div>
          {tags && (
            <ViewTransition name={`${transitionName}-tags`}>
              <div
                className={`post-tags-row ${readingProgressStyles.post_tags_row}`}
              >
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

        {slide && (
          <aside className="post-slide-note">
            <p>이 글은 발표 슬라이드로도 정리되어 있습니다.</p>
            <a
              href={`https://research.yceffort.kr/slides/${slide}`}
              target="_blank"
              rel="noopener noreferrer"
              className="post-slide-note-link"
            >
              슬라이드로 보기 →
            </a>
          </aside>
        )}

        <PostArticle body={body} path={path} />

        {series && seriesPosts.length > 1 && (
          <SeriesPrevNext seriesPosts={seriesPosts} currentSlug={postSlug} />
        )}

        <RelatedPosts posts={relatedPosts} title="관련 글" />

        <SubscribeCta />

        <footer className="post-footer">
          <p className="post-author-note">
            <Link href="/about">yceffort</Link>
            {' — 프론트엔드 엔지니어입니다.'}
          </p>
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
