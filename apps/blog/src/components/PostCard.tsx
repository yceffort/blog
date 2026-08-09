'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useRef, ViewTransition} from 'react'

import {EmphasizedTitle} from '@yceffort/shared/components'
import {stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'

import type {Post} from '@/type'

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
  const ogImageUrl = buildOgImageUrl({
    title: plainTitle,
    description,
    tags,
    path: '/' + slug,
    thumbnail,
  })

  const cardRef = useRef<HTMLElement>(null)

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = cardRef.current
    if (!el) {
      return
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      return
    }
    const tiltAttr = Number(
      getComputedStyle(document.documentElement).getPropertyValue('--tilt') ||
        '8',
    )
    const tilt = Number.isFinite(tiltAttr) ? tiltAttr : 8
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    const rx = (0.5 - y) * tilt
    const ry = (x - 0.5) * tilt
    el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
  }

  const onPointerLeave = () => {
    const el = cardRef.current
    if (!el) {
      return
    }
    el.style.transform = 'perspective(1200px) rotateX(0) rotateY(0)'
  }

  return (
    <>
      <link rel="prefetch" href={ogImageUrl} as="image" />
      <link rel="prefetch" href={`${ogImageUrl}&size=large`} as="image" />
      <article
        ref={cardRef}
        className="post-card"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <Link
          href={`${pathPrefix}/${slug}`}
          aria-label={plainTitle}
          prefetch={false}
        />
        {!published && (
          <span className="absolute right-2 top-2 z-10 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow">
            Draft
          </span>
        )}
        {thumbnail && (
          <ViewTransition name={`${transitionName}-thumbnail`}>
            <div className="thumb">
              <Image
                src={thumbnail}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                unoptimized
              />
            </div>
          </ViewTransition>
        )}

        <div className="body">
          {series && <span className="series">◆ {series}</span>}
          <ViewTransition name={`${transitionName}-tags`}>
            <div className="tag-row">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="tag-chip">
                  #{tag}
                </span>
              ))}
            </div>
          </ViewTransition>

          <ViewTransition name={transitionName}>
            <h3>
              <EmphasizedTitle title={rawTitle} />
            </h3>
          </ViewTransition>

          {!thumbnail && description && <p className="desc">{description}</p>}

          <div className="meta">
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
