import {parseTitleEmphasis, stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'
import {cacheLife, cacheTag} from 'next/cache'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import Script from 'next/script'
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

export async function generateMetadata(props: {
  params: Promise<{year: string; slug: string[]}>
}) {
  const params = await props.params
  const {year, slug} = params
  const post = await findPostByYearAndSlug(year, slug, 'en')

  if (!post) {
    return {}
  }

  const plainTitle = stripTitleEmphasis(post.frontMatter.title)

  return {
    title: plainTitle,
    description: post.frontMatter.description,
    openGraph: {
      title: plainTitle,
      description: post.frontMatter.description,
      url: `${SiteConfig.url}/en/${post.fields.slug}`,
      locale: 'en_US',
      images: [
        {
          url: buildOgImageUrl({
            title: plainTitle,
            description: post.frontMatter.description,
            tags: post.frontMatter.tags,
            path: '/en/' + post.fields.slug,
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
      languages: {
        ko: `${SiteConfig.url}/${post.fields.slug}`,
      },
      canonical: `${SiteConfig.url}/en/${post.fields.slug}`,
      types: {
        'text/markdown': `${SiteConfig.url}/en/${post.fields.slug}.md`,
      },
    },
  }
}

export async function generateStaticParams() {
  const slugs = await getFeaturedSlugs('en')
  return slugs.map((slug) => {
    const [year, ...rest] = slug.split('/')
    return {year, slug: rest}
  })
}

export default async function EnPostPage(props: {
  params: Promise<{year: string; slug: string[]}>
}) {
  const params = await props.params
  const {year, slug} = params

  const post = await findPostByYearAndSlug(year, slug, 'en')
  if (!post) {
    return notFound()
  }

  if (process.env.NODE_ENV !== 'production') {
    return <EnPostBody year={year} slug={slug} />
  }

  return <CachedEnPostBody year={year} slug={slug} />
}

async function CachedEnPostBody({year, slug}: {year: string; slug: string[]}) {
  'use cache'
  cacheLife('max')
  cacheTag(`post:en/${year}/${slug.join('/')}`)

  return <EnPostBody year={year} slug={slug} />
}

async function EnPostBody({year, slug}: {year: string; slug: string[]}) {
  const post = await findPostByYearAndSlug(year, slug, 'en')
  if (!post) {
    return null
  }

  const {
    frontMatter: {title, tags, date, description, series},
    body,
    path,
    fields: {slug: postSlug},
    readingTime,
  } = post

  const relatedPosts = await getRelatedPosts(postSlug, tags, 'en')
  const seriesPosts = series ? await getSeriesPosts(series, 'en') : []

  const updatedAt = format(new Date(date), 'yyyy-MM-dd')
  const transitionName = `post-${postSlug.replace(/\//g, '-')}`
  const plainTitle = stripTitleEmphasis(title)

  const thumbnail = post.frontMatter.thumbnail
  const ogImageUrl = buildOgImageUrl({
    title: plainTitle,
    description,
    tags,
    path: '/en/' + postSlug,
    thumbnail,
  })

  const postYear = new Date(date).getFullYear()

  const postUrl = `${SiteConfig.url}/en/${postSlug}`
  const jsonLd = [
    buildBlogPostingJsonLd({
      title: plainTitle,
      description,
      date,
      tags,
      imageUrl: `${SiteConfig.url}${ogImageUrl}`,
      url: postUrl,
      inLanguage: 'en',
    }),
    buildBreadcrumbJsonLd([
      {name: 'Home', url: `${SiteConfig.url}/en`},
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
        <Link href="/en" className="post-back">
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
          <div className="info">
            <div className="post-eyebrow">◆ ESSAY</div>
            <div className="post-author">
              <ProfileImage
                size={40}
                transitionName={`${transitionName}-avatar`}
              />
              <div>
                <div className="nm">{SiteConfig.author.name}</div>
                <div className="sub">
                  {updatedAt} · {readingTime} min read
                </div>
              </div>
            </div>
            {tags && (
              <ViewTransition name={`${transitionName}-tags`}>
                <div className="post-tags-row">
                  {tags.slice(0, 5).map((tag) => (
                    <Tag key={tag} text={tag} linked={false} />
                  ))}
                </div>
              </ViewTransition>
            )}
            <div className="post-stats">
              <div>
                <b>{readingTime}</b>min read
              </div>
              <div>
                <b>{postYear}</b>year
              </div>
              <div>
                <b>EN</b>translated
              </div>
            </div>
          </div>
          <ViewTransition name={transitionName}>
            <h1 className="post-title">
              {titleParts.map((part, i) =>
                part.emphasis ? <em key={i}>{part.text}</em> : part.text,
              )}
            </h1>
          </ViewTransition>
        </section>

        {series && seriesPosts.length > 1 && (
          <SeriesNavigation
            seriesName={series}
            seriesPosts={seriesPosts}
            currentSlug={postSlug}
            pathPrefix="/en"
            locale="en"
          />
        )}

        <PostArticle body={body} path={path} />

        {series && seriesPosts.length > 1 && (
          <SeriesPrevNext
            seriesPosts={seriesPosts}
            currentSlug={postSlug}
            pathPrefix="/en"
            locale="en"
          />
        )}

        <RelatedPosts
          posts={relatedPosts}
          pathPrefix="/en"
          title="Related posts"
        />

        <SubscribeCta lang="en" />

        <footer className="post-footer">
          <Link href="/en">&larr; Back to the blog</Link>
          <Link href={`/${postSlug}`} className="issue">
            한국어로 읽기 →
          </Link>
        </footer>
      </div>
      <TableOfContents />
    </>
  )
}
