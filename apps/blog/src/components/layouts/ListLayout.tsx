import type {Post} from '#src/type'

import PostCard from '#components/PostCard'

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
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl font-black leading-9 tracking-tight text-black dark:text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
          {title}
        </h1>
      </div>
      <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <li key={`${post.fields.slug}_${index}`} className="py-2">
            <PostCard post={post} pathPrefix={pathPrefix} />
          </li>
        ))}
      </ul>
    </div>
  )
}
