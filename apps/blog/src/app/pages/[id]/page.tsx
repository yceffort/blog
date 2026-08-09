import type {Metadata} from 'next'
import {permanentRedirect} from 'next/navigation'

import ListLayout from '@/components/layouts/ListLayout'
import PageNumber from '@/components/layouts/PageNumber'
import {SiteConfig} from '@/config'
import {DEFAULT_NUMBER_OF_POSTS} from '@/constants'
import {buildOgImageUrl} from '@/utils/og'
import {getAllPosts} from '@/utils/Post'

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
          url: buildOgImageUrl({
            title: pageTitle,
            description: pageDescription,
            path: `/pages/${id}`,
            type: 'page',
          }),
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: `${SiteConfig.url}/pages/${id}`,
    },
  }
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return Array.from(
    {length: Math.ceil(posts.length / DEFAULT_NUMBER_OF_POSTS)},
    (_, i) => ({id: `${i + 1}`}),
  )
}

export default async function Page(props: {params: Promise<{id: string}>}) {
  const params = await props.params
  const allPosts = await getAllPosts()
  const pageNo = Number(params.id)
  const lastPage = Math.ceil(allPosts.length / DEFAULT_NUMBER_OF_POSTS)

  if (!Number.isInteger(pageNo) || pageNo < 1) {
    permanentRedirect('/pages/1')
  }

  if (pageNo > lastPage) {
    permanentRedirect(`/pages/${lastPage}`)
  }

  const startIndex = (pageNo - 1) * DEFAULT_NUMBER_OF_POSTS
  const endIndex = startIndex + DEFAULT_NUMBER_OF_POSTS
  const posts = allPosts.slice(startIndex, endIndex)

  const hasNextPage = lastPage > pageNo

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
