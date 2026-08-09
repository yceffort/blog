import Image from 'next/image'
import Link from 'next/link'
import {ViewTransition} from 'react'

import {EmphasizedTitle} from '@yceffort/shared/components'
import {stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'

import type {Post} from '@/type'

export default function PostRow({
  post,
  pathPrefix = '',
}: {
  post: Post
  pathPrefix?: string
}) {
  const {
    fields: {slug},
    frontMatter: {
      date,
      title: rawTitle,
      description,
      tags,
      thumbnail,
      series,
      published,
    },
    readingTime,
  } = post
  const plainTitle = stripTitleEmphasis(rawTitle)
  const d = new Date(date)
  const isoDate = format(d, 'yyyy-MM-dd')
  const transitionName = `post-${slug.replace(/\//g, '-')}`

  return (
    <article className="post-row relative">
      <Link
        href={`${pathPrefix}/${slug}`}
        aria-label={plainTitle}
        className="post-row-link"
        prefetch={false}
      />
      {!published && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow">
          Draft
        </span>
      )}
      {thumbnail ? (
        <ViewTransition name={`${transitionName}-thumbnail`}>
          <div className="post-row-thumb">
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="(min-width: 768px) 120px, 84px"
              unoptimized={thumbnail.startsWith('/api/')}
            />
          </div>
        </ViewTransition>
      ) : (
        <div className="post-row-thumb post-row-thumb-empty" aria-hidden="true">
          <svg
            viewBox="0 0 48 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 10h22M8 16h32M8 22h18"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
        </div>
      )}

      <div className="post-row-body">
        <div className="post-row-head">
          {series && <span className="series">◆ {series}</span>}
          <ViewTransition name={`${transitionName}-tags`}>
            <div className="post-row-tags">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
          </ViewTransition>
        </div>

        <ViewTransition name={transitionName}>
          <h3 className="post-row-title">
            <EmphasizedTitle title={rawTitle} />
          </h3>
        </ViewTransition>

        {description && <p className="post-row-desc">{description}</p>}

        <div className="post-row-meta">
          <time dateTime={isoDate}>{isoDate}</time>
          <span aria-hidden="true">·</span>
          <span>
            {pathPrefix ? `${readingTime} min read` : `${readingTime}분`}
          </span>
        </div>
      </div>

      <svg
        className="post-row-arrow"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5 12h14" />
        <path d="M13 5l7 7-7 7" />
      </svg>
    </article>
  )
}
