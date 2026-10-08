import * as stylex from '@stylexjs/stylex'
import {parseTitleEmphasis, stripTitleEmphasis} from '@yceffort/shared/utils'
import type {Metadata} from 'next'
import {cacheLife, cacheTag} from 'next/cache'
import Link from 'next/link'
import {notFound, permanentRedirect} from 'next/navigation'
import Script from 'next/script'
import {connection} from 'next/server'
import {ViewTransition} from 'react'

import * as ambientStyles from '@/components/layout/ambient.styles'
import {PostArticle} from '@/components/post/PostArticle'
import PostDate from '@/components/post/PostDate'
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
  type Locale,
} from '@/utils/Post'
import {findSeriesByPostSlug} from '@/utils/Series'

// 한국어판과 영문판 상세는 이 파일 하나로 그린다. 두 벌로 나눠 고치다 화면이 어긋났던 적이 있다.
const LABELS = {
  ko: {
    pathPrefix: '',
    inLanguage: 'ko-KR',
    updated: '수정',
    readingTime: (minutes: number) => `${minutes}분`,
    statsMin: 'min',
    langCode: 'KO',
    langNote: 'original',
    related: '관련 글',
    authorNote: ' — 프론트엔드 엔지니어입니다.',
    slideNote: '이 글은 발표 슬라이드로도 정리되어 있습니다.',
    slideLink: '슬라이드로 보기 →',
  },
  en: {
    pathPrefix: '/en',
    inLanguage: 'en',
    updated: 'Updated',
    readingTime: (minutes: number) => `${minutes} min read`,
    statsMin: 'min read',
    langCode: 'EN',
    langNote: 'translated',
    related: 'Related posts',
    authorNote: ' — frontend engineer.',
    slideNote: 'This post is also available as presentation slides (Korean).',
    slideLink: 'View slides →',
  },
} as const

const sx = stylex.create({
  div: {
    '@layer utilities': {
      position: 'relative',
    },
  },
  draft: {
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

export interface PostParams {
  year: string
  slug: string[]
}

export async function generatePostMetadata(
  {year, slug}: PostParams,
  locale: Locale,
): Promise<Metadata> {
  const post = await findPostByYearAndSlug(year, slug, locale)
  if (!post) {
    return {}
  }
  const {pathPrefix} = LABELS[locale]
  const postSlug = post.fields.slug
  const hasEn =
    locale === 'en' || (await findPostByYearAndSlug(year, slug, 'en')) != null
  const plainTitle = stripTitleEmphasis(post.frontMatter.title)
  return {
    title: plainTitle,
    description: post.frontMatter.description,
    openGraph: {
      title: plainTitle,
      description: post.frontMatter.description,
      url: `${SiteConfig.url}${pathPrefix}/${postSlug}`,
      ...(locale === 'en' && {locale: 'en_US'}),
      images: [
        {
          url: buildOgImageUrl({
            title: plainTitle,
            description: post.frontMatter.description,
            tags: post.frontMatter.tags,
            path: `${pathPrefix}/${postSlug}`,
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
      canonical: `${SiteConfig.url}${pathPrefix}/${postSlug}`,
      ...(hasEn && {
        languages:
          locale === 'en'
            ? {ko: `${SiteConfig.url}/${postSlug}`}
            : {en: `${SiteConfig.url}/en/${postSlug}`},
      }),
      types: {
        'text/markdown': `${SiteConfig.url}${pathPrefix}/${postSlug}.md`,
      },
    },
  }
}

export async function generatePostStaticParams(locale: Locale) {
  const slugs = await getPrerenderSlugs(locale)
  return slugs.map((slug) => {
    const [year, ...rest] = slug.split('/')
    return {
      year,
      slug: rest,
    }
  })
}

export async function PostDetail({
  year,
  slug,
  locale,
}: PostParams & {locale: Locale}) {
  const post = await findPostByYearAndSlug(year, slug, locale)
  if (!post) {
    // 번역이 없는 글은 404 대신 한국어 원문으로 보낸다
    const koPost =
      locale === 'en' ? await findPostByYearAndSlug(year, slug) : undefined
    if (koPost) {
      permanentRedirect(`/${koPost.fields.slug}`)
    }
    return notFound()
  }
  if (process.env.NODE_ENV !== 'production') {
    await connection()
    return <PostBody year={year} slug={slug} locale={locale} />
  }
  return <CachedPostBody year={year} slug={slug} locale={locale} />
}

async function CachedPostBody({
  year,
  slug,
  locale,
}: PostParams & {locale: Locale}) {
  'use cache'

  cacheLife('max')
  cacheTag(`post:${locale}/${year}/${slug.join('/')}`)
  return <PostBody year={year} slug={slug} locale={locale} />
}

async function PostBody({year, slug, locale}: PostParams & {locale: Locale}) {
  const post = await findPostByYearAndSlug(year, slug, locale)
  if (!post) {
    return null
  }
  const labels = LABELS[locale]
  const {pathPrefix} = labels
  const {
    frontMatter: {
      title,
      tags,
      date,
      updated,
      description,
      series,
      published,
      slide,
    },
    body,
    path,
    fields: {slug: postSlug},
    readingTime,
  } = post
  const seriesInfo = await findSeriesByPostSlug(postSlug, locale)
  const relatedPosts = await getRelatedPosts(postSlug, tags, locale, series)
  const transitionName = `post-${postSlug.replace(/\//g, '-')}`
  const plainTitle = stripTitleEmphasis(title)
  const thumbnail = post.frontMatter.thumbnail
  const ogImageUrl = buildOgImageUrl({
    title: plainTitle,
    description,
    tags,
    path: `${pathPrefix}/${postSlug}`,
    thumbnail,
  })
  const postYear = new Date(date).getFullYear()
  const postUrl = `${SiteConfig.url}${pathPrefix}/${postSlug}`
  const jsonLd = [
    buildBlogPostingJsonLd({
      title: plainTitle,
      description,
      date,
      updated,
      tags,
      imageUrl: `${SiteConfig.url}${ogImageUrl}`,
      url: postUrl,
      inLanguage: labels.inLanguage,
    }),
    buildBreadcrumbJsonLd([
      {
        name: 'Home',
        url: `${SiteConfig.url}${pathPrefix}`,
      },
      // 연도별 아카이브는 한국어판에만 있다
      ...(locale === 'ko'
        ? [
            {
              name: `${postYear}`,
              url: `${SiteConfig.url}/archive#${postYear}`,
            },
          ]
        : []),
      {
        name: plainTitle,
        url: postUrl,
      },
    ]),
  ]
  const titleParts = parseTitleEmphasis(title)
  const hasSeriesNav = seriesInfo && seriesInfo.posts.length > 1
  return (
    <>
      <Script
        id={`jsonld-${postSlug.replace(/\//g, '-')}`}
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(jsonLd)}
      </Script>
      <div
        className={`page-view ${ambientStyles.page_view} ${stylex.props(sx.div).className}`}
      >
        <Link
          href={pathPrefix || '/'}
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
            <div className={stylex.props(sx.draft).className}>Draft</div>
          )}
          <div className={`post-eyebrow ${readingProgressStyles.post_eyebrow}`}>
            ◆{' '}
            {seriesInfo ? (
              <Link href={`${pathPrefix}/series/${seriesInfo.slug}`}>
                SERIES · {seriesInfo.name}
              </Link>
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
                  <PostDate value={date} />
                  {updated && (
                    <>
                      {' '}
                      · {labels.updated} <PostDate value={updated} />
                    </>
                  )}{' '}
                  · {labels.readingTime(readingTime)}
                </div>
              </div>
            </div>
            <div className={`post-stats ${readingProgressStyles.post_stats}`}>
              <div>
                <b className={readingProgressStyles.element_b}>{readingTime}</b>
                {labels.statsMin}
              </div>
              <div>
                <b className={readingProgressStyles.element_b}>{postYear}</b>
                year
              </div>
              <div>
                <b className={readingProgressStyles.element_b}>
                  {labels.langCode}
                </b>
                {labels.langNote}
              </div>
            </div>
          </div>
          {tags && (
            <ViewTransition name={`${transitionName}-tags`}>
              <div
                className={`post-tags-row ${readingProgressStyles.post_tags_row}`}
              >
                {tags.slice(0, 5).map((tag) => (
                  <Tag key={tag} text={tag} pathPrefix={pathPrefix} />
                ))}
              </div>
            </ViewTransition>
          )}
        </section>

        {hasSeriesNav && (
          <SeriesNavigation
            seriesName={seriesInfo.name}
            seriesSlug={seriesInfo.slug}
            seriesPosts={seriesInfo.posts}
            currentSlug={postSlug}
            pathPrefix={pathPrefix}
            locale={locale}
          />
        )}

        {slide && (
          <aside className="post-slide-note">
            <p>{labels.slideNote}</p>
            <a
              href={`https://research.yceffort.kr/slides/${slide}`}
              target="_blank"
              rel="noopener noreferrer"
              className="post-slide-note-link"
            >
              {labels.slideLink}
            </a>
          </aside>
        )}

        <PostArticle body={body} path={path} />

        {hasSeriesNav && (
          <SeriesPrevNext
            seriesPosts={seriesInfo.posts}
            currentSlug={postSlug}
            pathPrefix={pathPrefix}
            locale={locale}
          />
        )}

        <RelatedPosts
          posts={relatedPosts}
          pathPrefix={pathPrefix}
          title={labels.related}
        />

        <SubscribeCta lang={locale} />

        <footer className="post-footer">
          <p className="post-author-note">
            <Link href={`${pathPrefix}/about`}>yceffort</Link>
            {labels.authorNote}
          </p>
          <Link href={pathPrefix || '/'}>&larr; Back to the blog</Link>
          {locale === 'ko' ? (
            <Link
              href={`https://github.com/yceffort/yceffort-blog-v2/issues/new?labels=%F0%9F%92%AC%20Discussion&title=[Discussion] issue on ${plainTitle}&assignees=yceffort&body=${SiteConfig.url}/${postSlug}`}
              className="issue"
            >
              Issue on GitHub →
            </Link>
          ) : (
            <Link href={`/${postSlug}`} className="issue">
              한국어로 읽기 →
            </Link>
          )}
        </footer>
      </div>
      <TableOfContents />
    </>
  )
}
