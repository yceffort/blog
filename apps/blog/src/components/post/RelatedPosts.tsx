import * as listStyles from '@/components/post/list.styles'
import PostRow from '@/components/post/PostRow'
import type {Post} from '@/type'
export default function RelatedPosts({
  posts,
  pathPrefix = '',
  title,
}: {
  posts: Post[]
  pathPrefix?: string
  title: string
}) {
  if (posts.length === 0) {
    return null
  }
  return (
    <section className="post-related" aria-label={title} data-nav="related">
      <h2 className="post-related-title">{title}</h2>
      <ul className={`post-row-list ${listStyles.post_row_list}`}>
        {posts.map((post) => (
          <li key={post.fields.slug} className={listStyles.post_row_list_li}>
            <PostRow post={post} pathPrefix={pathPrefix} />
          </li>
        ))}
      </ul>
    </section>
  )
}
