import PostRow from '@/components/PostRow'
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
    <section className="post-related" aria-label={title}>
      <h2 className="post-related-title">{title}</h2>
      <ul className="post-row-list">
        {posts.map((post) => (
          <li key={post.fields.slug}>
            <PostRow post={post} pathPrefix={pathPrefix} />
          </li>
        ))}
      </ul>
    </section>
  )
}
