import Image from 'next/image'
import Link from 'next/link'
import {ViewTransition} from 'react'

import {format} from 'date-fns'

import type {Post} from '#src/type'

import Tag from '#components/Tag'

export default function PostCard({post}: {post: Post}) {
  const {
    fields: {slug},
    frontMatter: {date, title, description, tags, thumbnail},
    readingTime,
  } = post
  const d = new Date(date)
  const isoDate = format(d, 'yyyy-MM-dd')
  const transitionName = `post-${slug.replace(/\//g, '-')}`

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary-300 dark:bg-gray-800/80 dark:ring-gray-700/60 dark:hover:ring-primary-500/50 dark:hover:shadow-primary-500/5">
      {thumbnail && (
        <div className="relative h-44 overflow-hidden">
          <Image
            src={thumbnail}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <ViewTransition name={`${transitionName}-tags`}>
          <div className="relative z-10 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag) => (
              <Tag key={tag} text={tag} />
            ))}
          </div>
        </ViewTransition>

        <ViewTransition name={transitionName}>
          <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight line-clamp-2">
            <Link
              href={`/${slug}`}
              className="text-gray-900 after:absolute after:inset-0 dark:text-gray-100"
            >
              {title}
            </Link>
          </h3>
        </ViewTransition>

        {!thumbnail && description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-500 line-clamp-2 dark:text-gray-400">
            {description}
          </p>
        )}

        <div className="mt-auto flex items-center gap-1.5 pt-4 text-xs text-gray-400 dark:text-gray-500">
          <time dateTime={isoDate}>{isoDate}</time>
          <span aria-hidden="true">·</span>
          <span>{readingTime}분</span>
        </div>
      </div>
    </article>
  )
}
