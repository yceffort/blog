'use client'

import Link from 'next/link'
import {memo, useEffect, useRef} from 'react'

import {EmphasizedTitle} from '@yceffort/shared/components'

const YEAR = new Date().getFullYear()

export interface HeroNowSeries {
  slug: string
  title: string
  description: string
  latestSlug: string
  posts: {slug: string; title: string}[]
}

interface HeroProps {
  postCount: number
  tagCount: number
  yearsWriting: number
  nowSeries?: HeroNowSeries
}

const Hero = memo(function HeroBase({
  postCount,
  tagCount,
  yearsWriting,
  nowSeries,
}: HeroProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      return
    }

    const el = titleRef.current
    if (!el) {
      return
    }
    const lines = el.querySelectorAll<HTMLSpanElement>('.ln')

    let raf = 0
    let targetX = 0
    let targetY = 0

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX / window.innerWidth - 0.5
      targetY = e.clientY / window.innerHeight - 0.5
      if (!raf) {
        raf = window.requestAnimationFrame(() => {
          lines.forEach((ln, i) => {
            const depth = (i + 1) * 6
            ln.style.transform = `translate3d(${targetX * depth}px, ${targetY * depth}px, 0)`
          })
          raf = 0
        })
      }
    }

    window.addEventListener('pointermove', onMove, {passive: true})
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) {
        window.cancelAnimationFrame(raf)
      }
    }
  }, [])

  return (
    <section className="home-hero">
      <div className="home-hero-inner">
        <div className="hero-main">
          <div className="hero-eyebrow">
            <span className="dot" />
            LIVE · SEOUL · {YEAR}
          </div>
          <h1 ref={titleRef} className="hero-title">
            <span className="ln">GRIND.</span>
            <span className="ln">
              <span className="accent">LEARN</span>
              <span className="stroke">,</span>
            </span>
            <span className="ln">
              REPEAT<span className="accent">.</span>
            </span>
          </h1>
          <div className="hero-sub">
            <p>
              A blog by <b style={{color: 'var(--ink)'}}>yceffort</b> — a
              frontend engineer writing about the shape of software, one week at
              a time.
            </p>
            <div className="hero-stats">
              <span>
                <b>{String(postCount).padStart(3, '0')}</b>posts
              </span>
              <span>
                <b>{String(tagCount).padStart(3, '0')}</b>tags
              </span>
              <span>
                <b>{String(yearsWriting).padStart(2, '0')}y</b>writing
              </span>
            </div>
          </div>
        </div>

        {nowSeries && (
          <aside className="hero-now" aria-label="지금 진행 중인 시리즈">
            <div className="hero-now-head">
              <span className="series-nav-kicker">NOW READING</span>
              <span className="series-nav-progress">
                {String(nowSeries.posts.length).padStart(2, '0')} POSTS
              </span>
            </div>
            <Link href={`/series/${nowSeries.slug}`} className="hero-now-title">
              <EmphasizedTitle title={nowSeries.title} />
            </Link>
            <p className="hero-now-desc">{nowSeries.description}</p>
            <ol className="hero-now-list">
              {nowSeries.posts.map((post, index) => (
                <li
                  key={post.slug}
                  data-latest={post.slug === nowSeries.latestSlug}
                >
                  <Link href={`/${post.slug}`} prefetch={false}>
                    <em>{String(index + 1).padStart(2, '0')}</em>
                    <span>{post.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </section>
  )
})

export default Hero
