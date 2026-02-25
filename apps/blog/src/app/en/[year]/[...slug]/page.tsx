import Image from 'next/image'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {ViewTransition} from 'react'

import {format} from 'date-fns'
import {MDXRemote} from 'next-mdx-remote-client/rsc'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import prism from 'rehype-prism-plus'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'

import MathLoader from '#components/layouts/Post/math'
import MDXComponents from '#components/MDXComponents'
import ProfileImage from '#components/ProfileImage'
import ReadingProgressBar from '#components/ReadingProgressBar'
import TableOfContents from '#components/TableOfContents'
import Tag from '#components/Tag'
import {SiteConfig} from '#src/config'
import imageMetadataPlugin from '#utils/imageMetadata'
import {extractCodeFilename, parseCodeSnippet} from '#utils/Markdown'
import {findPostByYearAndSlug, getAllPosts} from '#utils/Post'

export const dynamic = 'error'

export async function generateMetadata(props: {
  params: Promise<{year: string; slug: string[]}>
}) {
  const params = await props.params
  const {year, slug} = params
  const post = await findPostByYearAndSlug(year, slug, 'en')

  if (!post) {
    return {}
  }

  return {
    title: post.frontMatter.title,
    description: post.frontMatter.description,
    openGraph: {
      title: post.frontMatter.title,
      description: post.frontMatter.description,
      url: `${SiteConfig.url}/en/${post.fields.slug}`,
      locale: 'en_US',
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(post.frontMatter.title)}&description=${encodeURIComponent(post.frontMatter.description || '')}&tags=${encodeURIComponent((post.frontMatter.tags || []).join(','))}&path=${encodeURIComponent('/en/' + post.fields.slug)}${post.frontMatter.thumbnail ? `&thumbnail=${encodeURIComponent(post.frontMatter.thumbnail)}` : ''}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      languages: {
        ko: `${SiteConfig.url}/${post.fields.slug}`,
      },
      canonical: `${SiteConfig.url}/en/${post.fields.slug}`,
    },
  }
}

export async function generateStaticParams() {
  const allPosts = await getAllPosts('en')
  return allPosts.map(({fields: {slug}}) => {
    const [year, ...slugs] = slug.split('/')
    return {year, slug: slugs}
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

  const {
    frontMatter: {title, tags, date, description},
    body,
    path,
    fields: {slug: postSlug},
    readingTime,
  } = post

  const updatedAt = format(new Date(date), 'yyyy-MM-dd')
  const transitionName = `post-${postSlug.replace(/\//g, '-')}`

  const thumbnail = post.frontMatter.thumbnail
  const ogImageUrl = `/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description || '')}&tags=${encodeURIComponent((tags || []).join(','))}&path=${encodeURIComponent('/en/' + postSlug)}${thumbnail ? `&thumbnail=${encodeURIComponent(thumbnail)}` : ''}`
  const ogImageUrlLarge = `${ogImageUrl}&size=large`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished: new Date(date).toISOString(),
    dateModified: new Date(date).toISOString(),
    description,
    image: `${SiteConfig.url}${ogImageUrl}`,
    url: `${SiteConfig.url}/en/${postSlug}`,
    inLanguage: 'en',
    author: {
      '@type': 'Person',
      name: SiteConfig.author.name,
    },
  }

  return (
    <>
      <script
        dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
        type="application/ld+json"
      />
      <ReadingProgressBar />
      <MathLoader />
      <div className="relative">
        <article>
          {/* Cover Image - Large font for mobile */}
          <div className="relative mb-6 aspect-[1200/630] w-full overflow-hidden rounded-xl border border-gray-200 shadow-lg md:hidden dark:border-gray-700">
            <Image
              src={ogImageUrlLarge}
              alt={title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>
          {/* Cover Image - Normal font for desktop */}
          <div className="relative mb-6 hidden aspect-[1200/630] w-full overflow-hidden rounded-xl border border-gray-200 shadow-lg md:block dark:border-gray-700">
            <Image
              src={ogImageUrl}
              alt={title}
              fill
              className="object-cover"
              priority
              unoptimized
            />
          </div>

          {/* Post Meta */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ProfileImage
                size={32}
                transitionName={`${transitionName}-avatar`}
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {SiteConfig.author.name}
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <time dateTime={updatedAt}>{updatedAt}</time>
                  <span>·</span>
                  <span>{readingTime} min read</span>
                </div>
              </div>
            </div>
            {tags && (
              <ViewTransition name={`${transitionName}-tags`}>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 4).map((tag) => (
                    <Tag key={tag} text={tag} linked={false} />
                  ))}
                </div>
              </ViewTransition>
            )}
          </div>

          {/* Content */}
          <div className="prose max-w-none pb-8 dark:prose-dark">
            <MDXRemote
              source={body}
              components={MDXComponents}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkMath, remarkToc, remarkGfm],
                  rehypePlugins: [
                    rehypeKatex,
                    rehypeSlug,
                    extractCodeFilename,
                    [prism, {showLineNumbers: true}],
                    parseCodeSnippet,
                    rehypeAutolinkHeadings,
                    [imageMetadataPlugin, {path}],
                  ],
                },
              }}
            />
          </div>

          {/* Footer */}
          <footer className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/en"
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              >
                &larr; Back to the blog
              </Link>
              <Link
                href={`/${postSlug}`}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                한국어로 읽기
              </Link>
            </div>
          </footer>
        </article>
        <aside className="fixed right-8 top-24 w-64">
          <TableOfContents />
        </aside>
      </div>
    </>
  )
}
