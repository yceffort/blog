import {pageCount, pageItems} from '@yceffort/shared/utils'
import {permanentRedirect} from 'next/navigation'

import ListLayout from '@/components/post/ListLayout'
import PageNumber from '@/components/post/PageNumber'
import {DEFAULT_NUMBER_OF_POSTS} from '@/constants'
import type {Post} from '@/type'

// 글 목록을 `${basePath}/{번호}` 페이지로 나눈다. 범위 밖 번호는 가까운 페이지로 보낸다
export default function PaginatedList({
  posts,
  pageNo,
  basePath,
  title,
  pathPrefix,
}: {
  posts: Post[]
  pageNo: number
  basePath: string
  title: string
  pathPrefix: string
}) {
  const lastPage = pageCount(posts.length, DEFAULT_NUMBER_OF_POSTS)

  if (!Number.isInteger(pageNo) || pageNo < 1) {
    permanentRedirect(`${basePath}/1`)
  }

  if (pageNo > lastPage) {
    permanentRedirect(`${basePath}/${lastPage}`)
  }

  return (
    <>
      <ListLayout
        posts={pageItems(posts, pageNo, DEFAULT_NUMBER_OF_POSTS)}
        title={title}
        pathPrefix={pathPrefix}
      />
      <PageNumber
        pageNo={pageNo}
        next={`${basePath}/${pageNo + 1}`}
        prev={`${basePath}/${pageNo - 1}`}
        hasNextPage={lastPage > pageNo}
      />
    </>
  )
}
