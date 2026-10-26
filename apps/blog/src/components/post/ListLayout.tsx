import {ViewTransition} from 'react'

import * as ambientStyles from '@/components/layout/ambient.styles'
import * as sectionStyles from '@/components/layout/section.styles'
import * as listStyles from '@/components/post/list.styles'
import PostRow from '@/components/post/PostRow'
import type {Post} from '@/type'
export default function ListLayout({
  posts,
  title,
  titleTransitionName,
  pathPrefix = '',
}: {
  posts: Post[]
  title: string
  titleTransitionName?: string
  pathPrefix?: string
}) {
  const heading = <h2 className={sectionStyles.element_h2}>{title}</h2>
  return (
    <div className={`page-view ${ambientStyles.page_view}`}>
      <div className={`sec-head ${sectionStyles.sec_head}`}>
        <div>
          <span className={`sec-count ${sectionStyles.sec_count}`}>
            {String(posts.length).padStart(2, '0')} POSTS
          </span>
          {titleTransitionName ? (
            <ViewTransition name={titleTransitionName}>
              {heading}
            </ViewTransition>
          ) : (
            heading
          )}
        </div>
        <div className={`line ${sectionStyles.line}`} />
      </div>
      <ul className={`post-row-list ${listStyles.post_row_list}`}>
        {posts.map((post, index) => (
          <li
            key={`${post.fields.slug}_${index}`}
            className={listStyles.post_row_list_li}
          >
            <PostRow post={post} pathPrefix={pathPrefix} />
          </li>
        ))}
      </ul>
    </div>
  )
}
