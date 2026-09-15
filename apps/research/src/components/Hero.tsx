'use client'

import {memo, useEffect, useRef} from 'react'

import * as heroStyles from '@/components/hero.styles'

const YEAR = new Date().getFullYear()

const Hero = memo(function HeroBase() {
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

    window.addEventListener('pointermove', onMove, {passive: true})
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
        <div className={`hero-eyebrow ${heroStyles.hero_eyebrow}`}>
          <span className={`dot ${heroStyles.dot}`} />
          RESEARCH LAB · SEOUL · {YEAR}
        </div>
        <h1 ref={titleRef} className={`hero-title ${heroStyles.hero_title}`}>
          <span className={`ln ${heroStyles.ln}`}>SLOW.</span>
          <span className={`ln ${heroStyles.ln}`}>
            <span className={`accent ${heroStyles.accent}`}>DEEP</span>
            <span className={heroStyles.stroke}>,</span>
          </span>
          <span className={`ln ${heroStyles.ln}`}>
            SHARE<span className={`accent ${heroStyles.accent}`}>.</span>
          </span>
        </h1>
        <div className={heroStyles.hero_sub}>
          <p className={heroStyles.hero_sub_p}>
            Slides and long-form research notes by{' '}
            <b style={{color: 'var(--ink)'}}>yceffort</b> — deep dives into the
            frontend stack, presented one slide at a time.
          </p>
        </div>
      </div>
    </section>
  )
})

export default Hero
