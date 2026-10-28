import {buildOgImageUrl, pageCount} from '@yceffort/shared/utils'
import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'

import PaginatedList from '@/components/post/PaginatedList'
import {SiteConfig} from '@/config'
import {DEFAULT_NUMBER_OF_POSTS} from '@/constants'
import {openGraphBase} from '@/utils/metadata'
import {getAllPosts, getAllTagsFromPosts, type Locale} from '@/utils/Post'
import {pathPrefixOf} from '@/utils/postPaths'

export function tagPostsMetadata(
  {tag, id}: {tag: string; id: string},
  locale: Locale,
): Metadata {
  const path = `${pathPrefixOf(locale)}/tags/${encodeURIComponent(tag)}/pages/${id}`
  const url = `${SiteConfig.url}${path}`
  const title = `${tag}: Page ${id}`
  return {
    title,
    alternates: {
      canonical: url,
    },
    openGraph: {
      ...openGraphBase(locale),
      title,
      url,
      images: [
        {
          url: buildOgImageUrl({title, path, type: 'page'}),
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export async function tagPostsStaticParams(locale: Locale) {
  const allTags = await getAllTagsFromPosts(locale)
  const posts = await getAllPosts(locale)

  const paths: {tag: string; id: string}[] = []
  allTags.forEach(({tag}) => {
    const tagsCount: number = posts.filter((post) =>
      post.frontMatter.tags.find((t) => t === tag),
    ).length

    Array.from({
      length: pageCount(tagsCount, DEFAULT_NUMBER_OF_POSTS),
    }).forEach((_, i) => {
      paths.push({tag, id: `${i + 1}`})
    })
  })

  return paths
}

export default async function TagPostsView({
  tag,
  id,
  locale,
}: {
  tag: string
  id: string
  locale: Locale
}) {
  const pathPrefix = pathPrefixOf(locale)
  const allPosts = await getAllPosts(locale)
  const pageNo = Number(id)

  const postsWithTag = allPosts.filter((post) =>
    post.frontMatter.tags.find((t) => t === tag),
  )

  if (postsWithTag.length === 0) {
    permanentRedirect(`${pathPrefix}/tags`)
  }

  const title = `${tag[0].toUpperCase() + tag.split(' ').join('-').slice(1)} ${pageNo}`

  return (
    <PaginatedList
      posts={postsWithTag}
      pageNo={pageNo}
      basePath={`${pathPrefix}/tags/${encodeURIComponent(tag)}/pages`}
      title={title}
      titleTransitionName={`tag-${tag}`}
      pathPrefix={pathPrefix}
    />
  )
}
