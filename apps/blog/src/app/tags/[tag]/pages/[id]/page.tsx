import {permanentRedirect} from 'next/navigation'

import ListLayout from '@/components/layouts/ListLayout'
import PageNumber from '@/components/layouts/PageNumber'
import {DEFAULT_NUMBER_OF_POSTS} from '@/constants'
import {getAllPosts, getAllTagsFromPosts} from '@/utils/Post'

export async function generateMetadata(props: {
  params: Promise<{tag: string; id: string}>
}) {
  const params = await props.params

  const {tag, id} = params

  return {
    title: `${tag}: Page ${id}`,
    alternates: {
      canonical: `https://yceffort.kr/tags/${encodeURIComponent(tag)}/pages/${id}`,
    },
    openGraph: {
      url: `https://yceffort.kr/tags/${encodeURIComponent(tag)}/pages/${id}`,
    },
  }
}

export async function generateStaticParams() {
  const allTags = await getAllTagsFromPosts()
  const posts = await getAllPosts()

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

export default async function Page(props: {
  params: Promise<{tag: string; id: string}>
}) {
  const params = await props.params
  const allPosts = await getAllPosts()
  const {tag = 'javascript', id = '1'} = params
  const pageNo = Number(id)

  const postsWithTag = allPosts.filter((post) =>
    post.frontMatter.tags.find((t) => t === tag),
  )
  const lastPage = Math.ceil(postsWithTag.length / DEFAULT_NUMBER_OF_POSTS)
  const tagPath = `/tags/${encodeURIComponent(tag)}`

  if (postsWithTag.length === 0) {
    permanentRedirect('/tags')
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
      <ListLayout posts={posts} title={title} />
      <PageNumber
        pageNo={pageNo}
        next={`/tags/${tag}/pages/${pageNo + 1}`}
        prev={`/tags/${tag}/pages/${pageNo - 1}`}
        hasNextPage={hasNextPage}
      />
    </>
  )
}
