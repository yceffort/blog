import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'

import ListLayout from '@/components/post/ListLayout'
import PageNumber from '@/components/post/PageNumber'
import {SiteConfig} from '@/config'
import {DEFAULT_NUMBER_OF_POSTS} from '@/constants'
import {getAllPosts, getAllTagsFromPosts, type Locale} from '@/utils/Post'

const pathPrefixOf = (locale: Locale) => (locale === 'en' ? '/en' : '')

export function tagPostsMetadata(
  {tag, id}: {tag: string; id: string},
  locale: Locale,
): Metadata {
  const url = `${SiteConfig.url}${pathPrefixOf(locale)}/tags/${encodeURIComponent(tag)}/pages/${id}`
  return {
    title: `${tag}: Page ${id}`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      url,
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
      length: Math.ceil(tagsCount / DEFAULT_NUMBER_OF_POSTS),
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
  const lastPage = Math.ceil(postsWithTag.length / DEFAULT_NUMBER_OF_POSTS)
  const tagPath = `${pathPrefix}/tags/${encodeURIComponent(tag)}`

  if (postsWithTag.length === 0) {
    permanentRedirect(`${pathPrefix}/tags`)
  }

  if (!Number.isInteger(pageNo) || pageNo < 1) {
    permanentRedirect(`${tagPath}/pages/1`)
  }

  if (pageNo > lastPage) {
    permanentRedirect(`${tagPath}/pages/${lastPage}`)
  }
  const startIndex = (pageNo - 1) * DEFAULT_NUMBER_OF_POSTS
  const endIndex = startIndex + DEFAULT_NUMBER_OF_POSTS

  const posts = postsWithTag.slice(startIndex, endIndex)

  const hasNextPage = lastPage > pageNo

  const title = `${tag[0].toUpperCase() + tag.split(' ').join('-').slice(1)} ${pageNo}`

  return (
    <>
      <ListLayout posts={posts} title={title} pathPrefix={pathPrefix} />
      <PageNumber
        pageNo={pageNo}
        next={`${pathPrefix}/tags/${tag}/pages/${pageNo + 1}`}
        prev={`${pathPrefix}/tags/${tag}/pages/${pageNo - 1}`}
        hasNextPage={hasNextPage}
      />
    </>
  )
}
