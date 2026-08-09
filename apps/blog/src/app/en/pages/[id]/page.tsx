import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'

import ListLayout from '@/components/layouts/ListLayout'
import PageNumber from '@/components/layouts/PageNumber'
import {SiteConfig} from '@/config'
import {DEFAULT_NUMBER_OF_POSTS} from '@/constants'
import {getAllPosts} from '@/utils/Post'

export async function generateMetadata(props: {
  params: Promise<{id: string}>
}): Promise<Metadata> {
  const params = await props.params
  const {id} = params
  const pageTitle = `Page ${id} — ${SiteConfig.title} (English)`

  return {
    title: pageTitle,
    description: `English posts list page ${id}`,
    openGraph: {
      title: pageTitle,
      url: `${SiteConfig.url}/en/pages/${id}`,
    },
    alternates: {
      canonical: `${SiteConfig.url}/en/pages/${id}`,
    },
  }
}

export async function generateStaticParams() {
  const posts = await getAllPosts('en')
  return Array.from(
    {length: Math.ceil(posts.length / DEFAULT_NUMBER_OF_POSTS)},
    (_, i) => ({id: `${i + 1}`}),
  )
}

export default async function EnPagesPage(props: {
  params: Promise<{id: string}>
}) {
  const params = await props.params
  const allPosts = await getAllPosts('en')
  const pageNo = Number(params.id)
  const lastPage = Math.ceil(allPosts.length / DEFAULT_NUMBER_OF_POSTS)

  if (!Number.isInteger(pageNo) || pageNo < 1) {
    permanentRedirect('/en/pages/1')
  }

  if (pageNo > lastPage) {
    permanentRedirect(`/en/pages/${lastPage}`)
  }

  const startIndex = (pageNo - 1) * DEFAULT_NUMBER_OF_POSTS
  const endIndex = startIndex + DEFAULT_NUMBER_OF_POSTS
  const posts = allPosts.slice(startIndex, endIndex)

  const hasNextPage = lastPage > pageNo

  return (
    <>
      <ListLayout posts={posts} title={`Page ${pageNo}`} pathPrefix="/en" />
      <PageNumber
        pageNo={pageNo}
        next={`/en/pages/${pageNo + 1}`}
        prev={`/en/pages/${pageNo - 1}`}
        hasNextPage={hasNextPage}
      />
    </>
  )
}
