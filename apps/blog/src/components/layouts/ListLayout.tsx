import PostRow from '@/components/PostRow'
import type {Post} from '@/type'

export default function ListLayout({
  posts,
  title,
  pathPrefix = '',
}: {
  posts: Post[]
  title: string
  pathPrefix?: string
}) {
  return (
    <div className="page-view">
      <div className="sec-head">
        <div>
          <span className="sec-count">
            {String(posts.length).padStart(2, '0')} POSTS
          </span>
          <h2>{title}</h2>
        </div>
        <div className="line" />
      </div>
      <ul className="post-row-list">
        {posts.map((post, index) => (
          <li key={`${post.fields.slug}_${index}`}>
            <PostRow post={post} pathPrefix={pathPrefix} />
          </li>
        ))}
      </ul>
    </div>
  )
}
