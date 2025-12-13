import Link from 'next/link'
import {ViewTransition} from 'react'

import {format} from 'date-fns'

import type {Post} from '#src/type'

import ProfileImage from '#components/ProfileImage'
import Tag from '#components/Tag'

export default function PostCard({post}: {post: Post}) {
  const {
    fields: {slug},
    frontMatter: {date, title, description, tags},
  } = post
  const updatedAt = format(new Date(date), 'yyyy-MM-dd')
  const transitionName = `post-${slug.replace(/\//g, '-')}`

  return (
    <article className="group flex h-[280px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-500/10 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-primary-500 dark:hover:shadow-primary-500/20">
      <div className="flex flex-1 flex-col justify-between p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <ViewTransition name={`${transitionName}-tags`}>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 3).map((tag) => (
                  <Tag key={tag} text={tag} />
                ))}
              </div>
            </ViewTransition>
            <ProfileImage
              size={32}
              transitionName={`${transitionName}-avatar`}
            />
          </div>
          <div>
            <ViewTransition name={transitionName}>
              <h3 className="text-xl font-black leading-tight tracking-tight line-clamp-2">
                <Link
                  href={`/${slug}`}
                  className="text-black decoration-4 hover:underline dark:text-white"
                >
                  {title}
                </Link>
              </h3>
            </ViewTransition>
            <dl>
              <dt className="sr-only">Published on</dt>
              <dd className="text-sm font-bold leading-6 text-gray-600 dark:text-gray-400">
                <time dateTime={updatedAt}>{updatedAt}</time>
              </dd>
            </dl>
          </div>
          <div className="prose max-w-none text-sm font-medium text-gray-800 dark:text-gray-300 line-clamp-3">
            {description}
          </div>
        </div>
        <div className="mt-4 text-base font-black leading-6">
          <Link
            href={`/${slug}`}
            className="inline-flex items-center gap-1 text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
            aria-label={`Read "${title}"`}
          >
            Read more
            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </article>
  )
}
