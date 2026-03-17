import Image from 'next/image'
import Link from 'next/link'
import {ViewTransition} from 'react'

import {format} from 'date-fns'

import type {Post} from '@/type'

import Tag from '@/components/Tag'
import {buildOgImageUrl} from '@/utils/og'

export default function PostCard({
  post,
  pathPrefix = '',
}: {
  post: Post
  pathPrefix?: string
}) {
  const {
    fields: {slug},
    frontMatter: {date, title, description, tags, thumbnail, series},
    readingTime,
  } = post
  const d = new Date(date)
  const isoDate = format(d, 'yyyy-MM-dd')
  const transitionName = `post-${slug.replace(/\//g, '-')}`
  const ogImageUrl = buildOgImageUrl({
    title,
    description,
    tags,
    path: '/' + slug,
    thumbnail,
  })

  return (
    <>
      <link rel="prefetch" href={ogImageUrl} as="image" />
      <link rel="prefetch" href={`${ogImageUrl}&size=large`} as="image" />
      <article className="group relative flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-primary-300 dark:bg-gray-800/80 dark:ring-gray-700/60 dark:hover:ring-primary-500/50 dark:hover:shadow-primary-500/5">
        {thumbnail && (
          <ViewTransition name={`${transitionName}-thumbnail`}>
            <div className="relative h-44 overflow-hidden">
              <Image
                src={thumbnail}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </ViewTransition>
        )}

        <div className="flex flex-1 flex-col p-5">
          {series && (
            <span className="mb-2 inline-flex w-fit items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20">
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              {series}
            </span>
          )}
          <ViewTransition name={`${transitionName}-tags`}>
            <div className="relative z-10 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <Tag key={tag} text={tag} linked={!pathPrefix} />
              ))}
            </div>
          </ViewTransition>

          <ViewTransition name={transitionName}>
            <h3 className="mt-3 text-lg font-bold leading-snug tracking-tight line-clamp-2">
              <Link
                href={`${pathPrefix}/${slug}`}
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
            <span>
              {pathPrefix ? `${readingTime} min read` : `${readingTime}분`}
            </span>
          </div>
        </div>
      </article>
    </>
  )
}
