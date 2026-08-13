'use client'

import {EmphasizedTitle} from '@yceffort/shared/components'
import {stripTitleEmphasis} from '@yceffort/shared/utils'
import {format} from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'
import {useRef} from 'react'

import type {Series} from '@/type'

export default function PopularSeriesCard({
  series,
  thumbnail,
}: {
  series: Series
  thumbnail: string
}) {
  const {slug, title, posts} = series
  const latest = posts.reduce(
    (acc, p) => (p.frontMatter.date > acc ? p.frontMatter.date : acc),
    posts[0].frontMatter.date,
  )
  const isoDate = format(new Date(latest), 'yyyy-MM-dd')

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
    <article
      ref={cardRef}
      className="post-card"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <Link
        href={`/series/${slug}`}
        aria-label={stripTitleEmphasis(title)}
        prefetch={false}
      />
      <div className="thumb">
        <Image
          src={thumbnail}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
      </div>
      <div className="body">
        <span className="series">◆ 인기 시리즈</span>
        <h3>
          <EmphasizedTitle title={title} />
        </h3>
        <div className="meta">
          <span>{posts.length}편의 글</span>
          <span aria-hidden="true">·</span>
          <time dateTime={isoDate}>{isoDate} 업데이트</time>
        </div>
      </div>
    </article>
  )
}
