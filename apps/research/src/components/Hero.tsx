'use client'

import {memo, useEffect, useRef} from 'react'

const YEAR = new Date().getFullYear()

const Hero = memo(function HeroBase() {
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
        <div className="hero-eyebrow">
          <span className="dot" />
          RESEARCH LAB · SEOUL · {YEAR}
        </div>
        <h1 ref={titleRef} className="hero-title">
          <span className="ln">SLOW.</span>
          <span className="ln">
            <span className="accent">DEEP</span>
            <span className="stroke">,</span>
          </span>
          <span className="ln">
            SHARE<span className="accent">.</span>
          </span>
        </h1>
        <div className="hero-sub">
          <p>
            Slides and long-form research notes by{' '}
            <b style={{color: 'var(--ink)'}}>yceffort</b> — deep dives into the
            frontend stack, presented one deck at a time.
          </p>
        </div>
      </div>
    </section>
  )
})

export default Hero
