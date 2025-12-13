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
import {parseCodeSnippet} from '#utils/Markdown'
import {findPostByYearAndSlug, getAllPosts} from '#utils/Post'

export const dynamic = 'error'

export async function generateMetadata(props: {
  params: Promise<{year: string; slug: string[]}>
}) {
  const params = await props.params

  const {year, slug} = params

  const post = await findPostByYearAndSlug(year, slug)

  if (!post) {
    return {}
  }

  return {
    title: post.frontMatter.title,
    description: post.frontMatter.description,
    openGraph: {
      title: post.frontMatter.title,
      description: post.frontMatter.description,
      url: `${SiteConfig.url}/${post.fields.slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(post.frontMatter.title)}&description=${encodeURIComponent(post.frontMatter.description || '')}&tags=${encodeURIComponent((post.frontMatter.tags || []).join(','))}&path=${encodeURIComponent('/' + post.fields.slug)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  const allPosts = await getAllPosts()
  const result = allPosts.reduce<{year: string; slug: string[]}[]>(
    (prev, {fields: {slug}}) => {
      const [year, ...slugs] = `${slug.replace('.md', '')}`.split('/')

      prev.push({year, slug: slugs})
      return prev
    },
    [],
  )

  return result
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

  const {
    frontMatter: {title, tags, date, description},
    body,
    path,
    fields: {slug: postSlug},
  } = post

  const updatedAt = format(new Date(date), 'yyyy-MM-dd')
  const transitionName = `post-${postSlug.replace(/\//g, '-')}`
  const link = `https://github.com/yceffort/yceffort-blog-v2/issues/new?labels=%F0%9F%92%AC%20Discussion&title=[Discussion] issue on ${title}&assignees=yceffort&body=${SiteConfig.url}/${slug}`

  const ogImageUrl = `/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description || '')}&tags=${encodeURIComponent((tags || []).join(','))}&path=${encodeURIComponent('/' + postSlug)}`
  const ogImageUrlLarge = `${ogImageUrl}&size=large`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished: new Date(date).toISOString(),
    dateModified: new Date(date).toISOString(),
    description,
    image: `${SiteConfig.url}${ogImageUrl}`,
    url: `${SiteConfig.url}/${postSlug}`,
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
              <ProfileImage size={32} transitionName={`${transitionName}-avatar`} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {SiteConfig.author.name}
                </p>
                <time
                  dateTime={updatedAt}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  {updatedAt}
                </time>
              </div>
            </div>
            {tags && (
              <ViewTransition name={`${transitionName}-tags`}>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 4).map((tag) => (
                    <Tag key={tag} text={tag} />
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
                    prism,
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
                href="/"
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
              >
                &larr; Back to the blog
              </Link>
              <Link
                href={link}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Issue on GitHub
              </Link>
            </div>
          </footer>
        </article>
        <aside className="fixed right-8 top-24 hidden w-64 2xl:block">
          <TableOfContents />
        </aside>
      </div>
    </>
  )
}
