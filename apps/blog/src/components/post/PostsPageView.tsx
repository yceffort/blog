import {pageCount} from '@yceffort/shared/utils'
import type {Metadata} from 'next'

import PaginatedList from '@/components/post/PaginatedList'
import {SiteConfig} from '@/config'
import {DEFAULT_NUMBER_OF_POSTS} from '@/constants'
import {buildOgImageUrl} from '@/utils/og'
import {getAllPosts, type Locale} from '@/utils/Post'
import {pathPrefixOf} from '@/utils/postPaths'

export function postsPageMetadata(id: string, locale: Locale): Metadata {
  const path = `${pathPrefixOf(locale)}/pages/${id}`
  const pageTitle = `Page ${id} - ${SiteConfig.title}${locale === 'en' ? ' (English)' : ''}`
  const pageDescription = `${locale === 'en' ? 'English posts' : 'Posts'} list page ${id}`

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${SiteConfig.url}${path}`,
      images: [
        {
          url: buildOgImageUrl({
            title: pageTitle,
            description: pageDescription,
            path,
            type: 'page',
          }),
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: `${SiteConfig.url}${path}`,
    },
  }
}

export async function postsPageStaticParams(locale: Locale) {
  const posts = await getAllPosts(locale)
  return Array.from(
    {length: pageCount(posts.length, DEFAULT_NUMBER_OF_POSTS)},
    (_, i) => ({id: `${i + 1}`}),
  )
}

export default async function PostsPageView({
  id,
  locale,
}: {
  id: string
  locale: Locale
}) {
  const pathPrefix = pathPrefixOf(locale)
  const pageNo = Number(id)

  return (
    <PaginatedList
      posts={await getAllPosts(locale)}
      pageNo={pageNo}
      basePath={`${pathPrefix}/pages`}
      title={`Page ${pageNo}`}
      pathPrefix={pathPrefix}
    />
  )
}
