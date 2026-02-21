import {notFound} from 'next/navigation'

import type {Metadata} from 'next'

import ListLayout from '#components/layouts/ListLayout'
import PageNumber from '#components/layouts/PageNumber'
import {SiteConfig} from '#src/config'
import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'
import {getAllPosts} from '#utils/Post'

export const dynamic = 'error'

export async function generateMetadata(props: {
  params: Promise<{id: string}>
}): Promise<Metadata> {
  const params = await props.params
  const {id} = params
  const pageTitle = `Page ${id} - ${SiteConfig.title}`
  const pageDescription = `Posts list page ${id}`

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `${SiteConfig.url}/pages/${id}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(pageTitle)}&description=${encodeURIComponent(pageDescription)}&path=${encodeURIComponent(`/pages/${id}`)}&type=page`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return [
    ...new Array(Math.ceil(posts.length / DEFAULT_NUMBER_OF_POSTS)).keys(),
  ].map((i) => ({id: `${i + 1}`}))
}

export default async function Page(props: {params: Promise<{id: string}>}) {
  const params = await props.params
  const allPosts = await getAllPosts()
  const pageNo = parseInt(params.id)

  if (
    isNaN(pageNo) ||
    pageNo > Math.ceil(allPosts.length / DEFAULT_NUMBER_OF_POSTS) ||
    pageNo < 1
  ) {
    return notFound()
  }

  const startIndex = (pageNo - 1) * DEFAULT_NUMBER_OF_POSTS
  const endIndex = startIndex + DEFAULT_NUMBER_OF_POSTS
  const posts = allPosts.slice(startIndex, endIndex)

  const hasNextPage =
    Math.ceil(allPosts.length / DEFAULT_NUMBER_OF_POSTS) > pageNo

  return (
    <>
      <ListLayout posts={posts} title={`Page ${pageNo}`} />
      <PageNumber
        pageNo={pageNo}
        next={`/pages/${pageNo + 1}`}
        prev={`/pages/${pageNo - 1}`}
        hasNextPage={hasNextPage}
      />
    </>
  )
}
