'use client'

import {useEffect, useRef} from 'react'

const SIZE = 320
const STEP = 3
const MAX_FORCE = 38
const FORCE_RADIUS = 80

interface Particle {
  ox: number
  oy: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  g: number
  b: number
}

export default function HeroFxB() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({x: -9999, y: -9999, active: false})

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) {
      return undefined
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = SIZE * dpr
    canvas.height = SIZE * dpr
    canvas.style.width = `${SIZE}px`
    canvas.style.height = `${SIZE}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const tick = () => {
      const particles = particlesRef.current
      ctx.clearRect(0, 0, SIZE, SIZE)
      const {x: mx, y: my, active} = mouseRef.current
      const radius2 = FORCE_RADIUS * FORCE_RADIUS

      for (const p of particles) {
        if (active) {
          const dx = p.x - mx
          const dy = p.y - my
          const d2 = dx * dx + dy * dy
          if (d2 < radius2) {
            const d = Math.sqrt(d2) || 0.001
            const f = (1 - d / FORCE_RADIUS) * MAX_FORCE
            p.vx += (dx / d) * f * 0.06
            p.vy += (dy / d) * f * 0.06
          }
        }
        p.vx += (p.ox - p.x) * 0.045
        p.vy += (p.oy - p.y) * 0.045
        p.vx *= 0.82
        p.vy *= 0.82
        p.x += p.vx
        p.y += p.vy

        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`
        ctx.fillRect(p.x, p.y, STEP - 0.5, STEP - 0.5)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const img = new Image()
    img.src = '/profile.jpeg'
    img.crossOrigin = 'anonymous'

    img.addEventListener('load', () => {
      const sample = document.createElement('canvas')
      sample.width = SIZE
      sample.height = SIZE
      const sctx = sample.getContext('2d')!
      // crop center square
      const min = Math.min(img.width, img.height)
      const sx = (img.width - min) / 2
      const sy = (img.height - min) / 2
      sctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE)
      // circular mask
      sctx.globalCompositeOperation = 'destination-in'
      sctx.beginPath()
      sctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
      sctx.fill()

      const data = sctx.getImageData(0, 0, SIZE, SIZE).data
      const particles: Particle[] = []
      for (let y = 0; y < SIZE; y += STEP) {
        for (let x = 0; x < SIZE; x += STEP) {
          const i = (y * SIZE + x) * 4
          const a = data[i + 3]
          if (a < 100) {
            continue
          }
          particles.push({
            ox: x,
            oy: y,
            x,
            y,
            vx: 0,
            vy: 0,
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
          })
        }
      }
      particlesRef.current = particles
      tick()
    })

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * SIZE
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height) * SIZE
      mouseRef.current.active = true
    }
    const onLeave = () => {
      mouseRef.current.active = false
      mouseRef.current.x = -9999
      mouseRef.current.y = -9999
    }
    wrap.addEventListener('pointermove', onMove)
    wrap.addEventListener('pointerleave', onLeave)

    return () => {
      wrap.removeEventListener('pointermove', onMove)
      wrap.removeEventListener('pointerleave', onLeave)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <div ref={wrapRef} className="hero-fx-canvas hero-fx-b">
      <canvas ref={canvasRef} />
      <div className="hero-fx-hint">hover the portrait</div>
    </div>
  )
}
