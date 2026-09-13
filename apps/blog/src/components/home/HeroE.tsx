'use client'

import {memo, useEffect, useRef} from 'react'

import * as tagsStyles from '@/app/tags/tags.styles'
import * as heroStyles from '@/components/home/hero.styles'

const YEAR = new Date().getFullYear()
interface HeroProps {
  postCount: number
  tagCount: number
  yearsWriting: number
}
const Hero = memo(function HeroBase({
  postCount,
  tagCount,
  yearsWriting,
}: HeroProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      return undefined
    }
    const el = titleRef.current
    if (!el) {
      return undefined
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
    window.addEventListener('pointermove', onMove, {
      passive: true,
    })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) {
        window.cancelAnimationFrame(raf)
      }
    }
  }, [])
  return (
    <section className={`home-hero ${heroStyles.home_hero}`}>
      <div className={`home-hero-inner ${heroStyles.home_hero_inner}`}>
        <div className="hero-main">
          <div
            className={`hero-eyebrow ${heroStyles.hero_eyebrow} ${tagsStyles.hero_eyebrow}`}
          >
            <span className={`dot ${heroStyles.dot}`} />
            LIVE · SEOUL · {YEAR}
          </div>
          <h1 ref={titleRef} className={`hero-title ${heroStyles.hero_title}`}>
            <span className={`ln ${heroStyles.ln}`}>GRIND.</span>
            <span className={`ln ${heroStyles.ln}`}>
              <span
                className={`accent ${heroStyles.accent} ${tagsStyles.accent}`}
              >
                LEARN
              </span>
              <span
                className={`stroke ${heroStyles.stroke} ${tagsStyles.stroke}`}
              >
                ,
              </span>
            </span>
            <span className={`ln ${heroStyles.ln}`}>
              REPEAT
              <span
                className={`accent ${heroStyles.accent} ${tagsStyles.accent}`}
              >
                .
              </span>
            </span>
          </h1>
          <div className={`hero-sub ${heroStyles.hero_sub}`}>
            <p className={heroStyles.element_p}>
              {'A blog by '}
              <b
                style={{
                  color: 'var(--ink)',
                }}
                className={heroStyles.element_b}
              >
                yceffort
              </b>
              {
                ', a frontend engineer taking software apart to see how it works: framework internals, performance, and lessons from production.'
              }
            </p>
            <div className={`hero-stats ${heroStyles.hero_stats}`}>
              <span>
                <b className={heroStyles.element_b}>
                  {String(postCount).padStart(3, '0')}
                </b>
                posts
              </span>
              <span>
                <b className={heroStyles.element_b}>
                  {String(tagCount).padStart(3, '0')}
                </b>
                tags
              </span>
              <span>
                <b className={heroStyles.element_b}>
                  {String(yearsWriting).padStart(2, '0')}y
                </b>
                writing
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
})
export default Hero
