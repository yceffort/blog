'use client'

import {Canvas, useFrame, useThree} from '@react-three/fiber'
/* eslint-disable react/no-unknown-property, react-hooks/purity, react-hooks/immutability */
import {useEffect, useMemo, useRef, useState} from 'react'
import * as THREE from 'three'

const TEXT = 'yceffort.'

function sampleTextPoints(text: string, density: number) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const fontSize = 220
  ctx.font = `900 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
  const metrics = ctx.measureText(text)
  const width = Math.ceil(metrics.width) + 40
  const height = Math.ceil(fontSize * 1.3)
  canvas.width = width
  canvas.height = height
  ctx.font = `900 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(text, 20, height / 2)

  const data = ctx.getImageData(0, 0, width, height).data
  const points: {x: number; y: number}[] = []
  for (let y = 0; y < height; y += density) {
    for (let x = 0; x < width; x += density) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 128) {
        // center origin, flip Y
        points.push({x: x - width / 2, y: height / 2 - y})
      }
    }
  }
  return {points, width, height}
}

interface ParticleData {
  positions: Float32Array
  origins: Float32Array
  randoms: Float32Array
  count: number
}

interface HoverState {
  active: boolean
  strength: number
}

function ParticleField({
  color,
  hoverRef,
}: {
  color: string
  hoverRef: React.RefObject<HoverState>
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const {viewport, pointer} = useThree()

  const data = useMemo<ParticleData>(() => {
    const {points, width} = sampleTextPoints(TEXT, 4)
    const scale = 6 / width
    const n = points.length
    const positions = new Float32Array(n * 3)
    const origins = new Float32Array(n * 3)
    const randoms = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const ox = points[i].x * scale
      const oy = points[i].y * scale
      origins[i * 3] = ox
      origins[i * 3 + 1] = oy
      origins[i * 3 + 2] = 0
      positions[i * 3] = ox
      positions[i * 3 + 1] = oy
      positions[i * 3 + 2] = 0
      randoms[i * 3] = (Math.random() - 0.5) * 2
      randoms[i * 3 + 1] = (Math.random() - 0.5) * 2
      randoms[i * 3 + 2] = (Math.random() - 0.5) * 2
    }
    return {positions, origins, randoms, count: n}
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  useFrame((state, delta) => {
    if (!meshRef.current) {
      return
    }
    const {positions, origins, randoms} = data
    const t = state.clock.elapsedTime

    const target = hoverRef.current.active ? 1 : 0
    const ramp = 1 - Math.exp(-delta * 1.8)
    hoverRef.current.strength += (target - hoverRef.current.strength) * ramp
    const strength = hoverRef.current.strength

    const px = (pointer.x * viewport.width) / 2
    const py = (pointer.y * viewport.height) / 2

    for (let i = 0; i < data.count; i++) {
      const i3 = i * 3
      const ox = origins[i3]
      const oy = origins[i3 + 1]
      const dx = ox - px
      const dy = oy - py
      const dist2 = dx * dx + dy * dy
      const force = Math.min(2.5, 1.2 / (dist2 + 0.15)) * strength

      const cx = positions[i3]
      const cy = positions[i3 + 1]
      const cz = positions[i3 + 2]

      const wobble = Math.sin(t * 1.5 + randoms[i3] * 6) * 0.02 * strength
      const tx =
        ox + (dx / Math.sqrt(dist2 + 0.001)) * force + randoms[i3] * wobble
      const ty =
        oy + (dy / Math.sqrt(dist2 + 0.001)) * force + randoms[i3 + 1] * wobble
      const tz = randoms[i3 + 2] * force * 1.2

      const lerp = 1 - Math.exp(-delta * 6)
      const nx = cx + (tx - cx) * lerp
      const ny = cy + (ty - cy) * lerp
      const nz = cz + (tz - cz) * lerp
      positions[i3] = nx
      positions[i3 + 1] = ny
      positions[i3 + 2] = nz

      dummy.position.set(nx, ny, nz)
      const s = 0.025 + Math.min(0.04, force * 0.02)
      dummy.scale.setScalar(s)
      const rotAmount = strength * 0.6
      dummy.rotation.set(t * 0.4 * rotAmount + i, t * 0.3 * rotAmount + i, 0)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, data.count]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={color}
        metalness={0.4}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.15}
      />
    </instancedMesh>
  )
}

function readDarkColor() {
  if (typeof document === 'undefined') {
    return '#0284c7'
  }
  return document.documentElement.classList.contains('dark')
    ? '#38bdf8'
    : '#0284c7'
}

export default function HeroFxA() {
  const [color, setColor] = useState(readDarkColor)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<HoverState>({active: false, strength: 0})

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setColor(readDarkColor())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) {
      return undefined
    }
    const activate = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        hoverRef.current.active = true
      }
    }
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        hoverRef.current.active = true
      }
    }
    const deactivate = () => {
      hoverRef.current.active = false
    }
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', deactivate)
    el.addEventListener('pointerdown', activate)
    el.addEventListener('pointerup', deactivate)
    el.addEventListener('pointercancel', deactivate)
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', deactivate)
      el.removeEventListener('pointerdown', activate)
      el.removeEventListener('pointerup', deactivate)
      el.removeEventListener('pointercancel', deactivate)
    }
  }, [])

  return (
    <div ref={wrapRef} className="hero-fx-canvas">
      <Canvas
        dpr={[1, 1.8]}
        camera={{position: [0, 0, 5], fov: 45}}
        gl={{antialias: true, alpha: true}}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 5]} intensity={0.9} />
        <ParticleField color={color} hoverRef={hoverRef} />
      </Canvas>
      <div className="hero-fx-hint hero-fx-hint-desktop">hover to scatter</div>
      <div className="hero-fx-hint hero-fx-hint-touch">tap and hold</div>
    </div>
  )
}
