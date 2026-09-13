'use client'

import * as stylex from '@stylexjs/stylex'
import {stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import {useRef, ViewTransition} from 'react'

import {EmphasizedTitle} from '@/components/post/EmphasizedTitle'
import * as listStyles from '@/components/post/list.styles'
import type {Post} from '@/type'
const sx = stylex.create({
  span: {
    '@layer utilities': {
      position: 'absolute',
      top: 'calc(var(--spacing) * 2)',
      right: 'calc(var(--spacing) * 2)',
      zIndex: '10',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-amber-500)',
      paddingInline: 'calc(var(--spacing) * 2)',
      paddingBlock: 'calc(var(--spacing) * 0.5)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-white)',
      textTransform: 'uppercase',
      '--blog-shadow':
        '0 1px 3px 0 var(--blog-shadow-color, rgb(0 0 0 / 0.1)), 0 1px 2px -1px var(--blog-shadow-color, rgb(0 0 0 / 0.1))',
      boxShadow:
        'var(--blog-inset-shadow), var(--blog-inset-ring-shadow), var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
    },
  },
})
export default function PostCard({
  post,
  pathPrefix = '',
  badge,
  priority = false,
}: {
  post: Post
  pathPrefix?: string
  badge?: string
  priority?: boolean
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
      <article
        ref={cardRef}
        className={`post-card ${listStyles.post_card}`}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <Link
          href={`${pathPrefix}/${slug}`}
          aria-label={plainTitle}
          prefetch={false}
          className={listStyles.element_a}
        />
        {!published && (
          <span className={stylex.props(sx.span).className}>Draft</span>
        )}
        {thumbnail && (
          <ViewTransition name={`${transitionName}-thumbnail`}>
            <div className={`thumb ${listStyles.thumb}`}>
              <Image
                src={thumbnail}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                priority={priority}
                className={listStyles.element_img}
              />
            </div>
          </ViewTransition>
        )}

        <div className={`body ${listStyles.body}`}>
          {badge ? (
            <span className={`series ${listStyles.series}`}>◆ {badge}</span>
          ) : (
            series && (
              <span className={`series ${listStyles.series}`}>◆ {series}</span>
            )
          )}
          <ViewTransition name={`${transitionName}-tags`}>
            <div className={`tag-row ${listStyles.tag_row}`}>
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className={`tag-chip ${listStyles.tag_chip}`}>
                  #{tag}
                </span>
              ))}
            </div>
          </ViewTransition>

          <ViewTransition name={transitionName}>
            <h3 className={listStyles.element_h3}>
              <EmphasizedTitle title={rawTitle} />
            </h3>
          </ViewTransition>

          {!thumbnail && description && (
            <p className={`desc ${listStyles.desc}`}>{description}</p>
          )}

          <div className={`meta ${listStyles.meta}`}>
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
