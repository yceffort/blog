'use client'

import {useEffect} from 'react'

import * as ambientStyles from '@/components/layout/ambient.styles'

export default function AmbientEffects() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      return undefined
    }
    const glow = document.getElementById('cursor-glow')
    if (!glow) {
      return undefined
    }
    let raf = 0
    let nextX = window.innerWidth / 2
    let nextY = window.innerHeight / 2
    const onMove = (e: PointerEvent) => {
      nextX = e.clientX
      nextY = e.clientY
      if (!raf) {
        raf = window.requestAnimationFrame(() => {
          glow.style.left = `${nextX}px`
          glow.style.top = `${nextY}px`
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
    <>
      <div
        id="anim-bg"
        aria-hidden="true"
        className={ambientStyles.effect_anim_bg}
      />
      <div
        id="grain"
        aria-hidden="true"
        className={ambientStyles.effect_grain}
      />
      <div
        id="cursor-glow"
        aria-hidden="true"
        className={ambientStyles.effect_cursor_glow}
      />
    </>
  )
}
