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
import PageTitle from '#components/PageTitle'
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished: new Date(date).toISOString(),
    dateModified: new Date(date).toISOString(),
    description,
    image: `${SiteConfig.url}/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description || '')}&tags=${encodeURIComponent((tags || []).join(','))}&path=${encodeURIComponent('/' + postSlug)}`,
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
          <div className="xl:divide-y xl:divide-gray-200 xl:dark:divide-gray-700">
          <header className="pt-6 xl:pb-6">
            <div className="space-y-1 text-center">
              <dl className="space-y-10">
                <div>
                  <dt className="sr-only">Published on</dt>
                  <dd className="text-base font-medium leading-6 text-gray-500 dark:text-gray-400">
                    <time dateTime={updatedAt}>{updatedAt}</time>
                  </dd>
                </div>
              </dl>
              <div>
                <PageTitle transitionName={transitionName}>{title}</PageTitle>
              </div>
            </div>
          </header>
          <div
            className="divide-y divide-gray-200 pb-8 dark:divide-gray-700 xl:grid xl:grid-cols-4 xl:gap-x-6 xl:divide-y-0"
            style={{gridTemplateRows: 'auto 1fr'}}
          >
            <dl className="pt-6 pb-10 xl:border-b xl:border-gray-200 xl:pt-11 xl:dark:border-gray-700">
              <dt className="sr-only">Author</dt>
              <dd>
                <ul className="flex justify-center space-x-8 sm:space-x-12 xl:block xl:space-x-0 xl:space-y-8">
                  <li className="flex items-center space-x-2">
                    <ProfileImage
                      size={40}
                      transitionName={`${transitionName}-avatar`}
                    />
                    <dl className="whitespace-nowrap text-sm font-medium leading-5">
                      <dt className="sr-only">Name</dt>
                      <dd className="text-gray-900 dark:text-gray-100">
                        {SiteConfig.author.name}
                      </dd>
                    </dl>
                  </li>
                </ul>
              </dd>
            </dl>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 xl:col-span-3 xl:row-span-2 xl:pb-0">
              <div className="prose max-w-none pt-10 pb-8 dark:prose-dark">
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
              <div className="pt-6 pb-6 text-sm text-gray-700 dark:text-gray-300">
                <Link href={link}>Issue on GitHub</Link>
              </div>
            </div>
            <footer>
              <div className="divide-gray-200 text-sm font-medium leading-5 dark:divide-gray-700 xl:col-start-1 xl:row-start-2 xl:divide-y">
                {tags && (
                  <div className="py-4 xl:py-8">
                    <h2 className="mb-4 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Tags
                    </h2>
                    <ViewTransition name={`${transitionName}-tags`}>
                      <div className="flex flex-wrap gap-y-2">
                        {tags.map((tag) => (
                          <Tag key={tag} text={tag} />
                        ))}
                      </div>
                    </ViewTransition>
                  </div>
                )}
              </div>
              <div className="pt-4 xl:pt-8">
                <Link
                  href="/"
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                >
                  &larr; Back to the blog
                </Link>
              </div>
            </footer>
          </div>
        </div>
        </article>
        <aside className="fixed right-8 top-24 hidden w-64 2xl:block">
          <TableOfContents />
        </aside>
      </div>
    </>
  )
}
