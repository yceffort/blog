import {ImageResponse} from 'next/og'

import {parseTitleEmphasis} from '@yceffort/shared/utils'

import type {ReactNode} from 'react'

const WIDTH = 1200
const HEIGHT = 630

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/fonts-archive/NanumGothic/NanumGothicBold.ttf'

const DUOS: [string, string][] = [
  ['#fb923c', '#ec4899'],
  ['#a78bfa', '#6d28d9'],
  ['#38bdf8', '#0369a1'],
  ['#34d399', '#047857'],
  ['#fbbf24', '#d97706'],
  ['#f87171', '#b91c1c'],
  ['#60a5fa', '#1d4ed8'],
  ['#c084fc', '#7c3aed'],
  ['#f472b6', '#be185d'],
  ['#22d3ee', '#0e7490'],
]

const INK = '#0a0a0f'
const PAPER_LIGHT =
  'linear-gradient(160deg, #fdfbf7 0%, #faf5ec 55%, #f9f0f2 100%)'
const PAPER_DARK =
  'linear-gradient(160deg, #14141d 0%, #0d0d14 60%, #12101a 100%)'

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

interface Ctx {
  rand: () => number
  c1: string
  c2: string
  dark: boolean
}

function pick3({rand, c1, c2, dark}: Ctx, i: number): string {
  const roll = (i + Math.floor(rand() * 3)) % 3
  return roll === 0 ? c1 : roll === 1 ? c2 : dark ? '#e8e8f0' : INK
}

function svgWrap(children: ReactNode[], key: string) {
  return (
    <svg
      key={key}
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{position: 'absolute', top: 0, left: 0}}
    >
      {children}
    </svg>
  )
}

function threadSvg(ctx: Ctx, nodeCount: number, yMin: number, yMax: number) {
  const {rand, dark} = ctx
  const points = Array.from({length: nodeCount}, (_, i) => ({
    x: 80 + ((WIDTH - 160) / (nodeCount - 1)) * i + (rand() - 0.5) * 70,
    y: yMin + rand() * (yMax - yMin),
    size: 12 + rand() * 18,
  }))
  return svgWrap(
    [
      <polyline
        key="line"
        points={points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={alpha(dark ? '#f5f5fa' : INK, 0.35)}
        strokeWidth={3}
      />,
      ...points.map((p, i) => (
        <rect
          key={i}
          x={p.x - p.size / 2}
          y={p.y - p.size / 2}
          width={p.size}
          height={p.size}
          fill={pick3(ctx, i)}
          transform={`rotate(45 ${p.x} ${p.y})`}
        />
      )),
    ],
    'thread',
  )
}

function band(ctx: Ctx, key: string, opts?: {thin?: boolean}) {
  const {rand, c1, c2} = ctx
  const h = opts?.thin ? 22 + rand() * 40 : 100 + rand() * 130
  return (
    <div
      key={key}
      style={{
        position: 'absolute',
        left: -220,
        top: 40 + rand() * 420,
        width: WIDTH + 440,
        height: h,
        borderRadius: h,
        background: `linear-gradient(120deg, ${c1} 0%, ${c2} 100%)`,
        opacity: opts?.thin ? 0.45 : 0.85,
        transform: `rotate(${-26 + rand() * 52}deg)`,
      }}
    />
  )
}

function bandsLayout(ctx: Ctx) {
  const {rand} = ctx
  return [
    band(ctx, 'band'),
    rand() < 0.5 && band(ctx, 'band2', {thin: true}),
    threadSvg(ctx, 4 + Math.floor(rand() * 3), 90, 540),
  ]
}

function ringsLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const isCircle = rand() < 0.5
  const cx = 560 + rand() * 420
  const cy = 140 + rand() * 300
  const size = 340 + rand() * 180
  const rot = 45 + rand() * 30
  const rings = [1, 0.66, 0.36]
  return [
    svgWrap(
      [
        ...rings.map((ratio, i) => {
          const s = size * ratio
          return isCircle ? (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={s / 2}
              fill="none"
              stroke={alpha(i === 1 ? c2 : c1, 0.4 + i * 0.25)}
              strokeWidth={5 - i}
            />
          ) : (
            <rect
              key={i}
              x={cx - s / 2}
              y={cy - s / 2}
              width={s}
              height={s}
              fill="none"
              stroke={alpha(i === 1 ? c2 : c1, 0.4 + i * 0.25)}
              strokeWidth={5 - i}
              transform={`rotate(${rot + i * 12} ${cx} ${cy})`}
            />
          )
        }),
        <rect
          key="core"
          x={cx - 15}
          y={cy - 15}
          width={30}
          height={30}
          fill={c2}
          transform={`rotate(45 ${cx} ${cy})`}
        />,
      ],
      'rings',
    ),
    band(ctx, 'underline', {thin: true}),
    threadSvg(ctx, 3, 100, 420),
  ]
}

function fieldLayout(ctx: Ctx) {
  const {rand} = ctx
  const count = 11 + Math.floor(rand() * 5)
  return [
    band(ctx, 'belt', {thin: true}),
    ...Array.from({length: count}, (_, i) => {
      const size = 10 + rand() * 44
      return (
        <div
          key={`piece-${i}`}
          style={{
            position: 'absolute',
            left: 40 + rand() * (WIDTH - 120),
            top: 40 + rand() * (HEIGHT - 120),
            width: size,
            height: size,
            background: pick3(ctx, i),
            opacity: 0.35 + rand() * 0.6,
            transform: `rotate(${45 + rand() * 40}deg)`,
          }}
        />
      )
    }),
  ]
}

function columnsLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const count = 2 + Math.floor(rand() * 2)
  return [
    ...Array.from({length: count}, (_, i) => {
      const w = i === 0 ? 110 + rand() * 120 : 22 + rand() * 60
      return (
        <div
          key={`col-${i}`}
          style={{
            position: 'absolute',
            left: 80 + rand() * (WIDTH - 300),
            top: -120,
            width: w,
            height: HEIGHT + 240,
            borderRadius: w,
            background: `linear-gradient(175deg, ${c1} 0%, ${c2} 100%)`,
            opacity: i === 0 ? 0.85 : 0.4,
            transform: `rotate(${-8 + rand() * 16}deg)`,
          }}
        />
      )
    }),
    threadSvg(ctx, 5 + Math.floor(rand() * 3), 180, 460),
  ]
}

function codePanelLayout(ctx: Ctx) {
  const {rand, c1, c2, dark} = ctx
  const lineCount = 9 + Math.floor(rand() * 4)
  const px = 90 + rand() * 160
  const py = 60 + rand() * 60
  const pw = 620 + rand() * 300
  const lines = Array.from({length: lineCount}, (_, i) => {
    const indent = [0, 40, 40, 80, 80, 40][Math.floor(rand() * 6)]
    return {
      indent,
      segs: Array.from({length: 1 + Math.floor(rand() * 3)}, () => ({
        w: 40 + rand() * 150,
        c: rand() < 0.4 ? c1 : rand() < 0.6 ? c2 : dark ? '#3c3c50' : '#d8d2c6',
      })),
      y: i,
    }
  })
  return [
    <div
      key="panel"
      style={{
        position: 'absolute',
        left: px,
        top: py,
        width: pw,
        height: 34 + lineCount * 34 + 20,
        borderRadius: 18,
        background: dark ? alpha('#1d1d2b', 0.9) : alpha('#ffffff', 0.75),
        border: `1px solid ${dark ? '#2c2c40' : '#e5ddcf'}`,
        display: 'flex',
      }}
    />,
    <div
      key="dots"
      style={{
        position: 'absolute',
        left: px + 20,
        top: py + 16,
        display: 'flex',
        gap: 8,
      }}
    >
      {[c1, c2, dark ? '#3c3c50' : '#d8d2c6'].map((c, i) => (
        <div
          key={i}
          style={{width: 12, height: 12, borderRadius: 999, background: c}}
        />
      ))}
    </div>,
    ...lines.map((line, i) => (
      <div
        key={`line-${i}`}
        style={{
          position: 'absolute',
          left: px + 24 + line.indent,
          top: py + 48 + i * 34,
          display: 'flex',
          gap: 10,
        }}
      >
        {line.segs.map((seg, j) => (
          <div
            key={j}
            style={{
              width: seg.w,
              height: 14,
              borderRadius: 7,
              background: seg.c,
              opacity: 0.9,
            }}
          />
        ))}
      </div>
    )),
  ]
}

function contoursLayout(ctx: Ctx) {
  const {rand, c1, c2, dark} = ctx
  const layers = 6
  const baseY = 120 + rand() * 200
  const amp = 40 + rand() * 60
  const phase = rand() * 600
  return [
    svgWrap(
      Array.from({length: layers}, (_, i) => {
        const y = baseY + i * (46 + rand() * 14)
        const a = amp * (0.7 + rand() * 0.6)
        const p = phase + i * 90
        const d = `M -50 ${y} Q ${300 - p / 4} ${y - a}, ${600} ${y} T ${1250} ${y}`
        const color =
          i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : dark ? '#f5f5fa' : INK
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={alpha(color, i % 3 === 2 ? 0.25 : 0.65)}
            strokeWidth={i === Math.floor(layers / 2) ? 7 : 3}
          />
        )
      }),
      'contours',
    ),
    threadSvg(ctx, 3, 380, 540),
  ]
}

function gridChartLayout(ctx: Ctx) {
  const {rand, c1, c2, dark} = ctx
  const gridGap = 60
  const nodeCount = 5 + Math.floor(rand() * 3)
  const points = Array.from({length: nodeCount}, (_, i) => ({
    x: 100 + ((WIDTH - 200) / (nodeCount - 1)) * i,
    y: 460 - rand() * 330 - i * (rand() * 20),
  }))
  const gridColor = alpha(dark ? '#f5f5fa' : INK, 0.07)
  return [
    svgWrap(
      [
        ...Array.from({length: Math.ceil(WIDTH / gridGap)}, (_, i) => (
          <line
            key={`v-${i}`}
            x1={i * gridGap}
            y1={0}
            x2={i * gridGap}
            y2={HEIGHT}
            stroke={gridColor}
            strokeWidth={1}
          />
        )),
        ...Array.from({length: Math.ceil(HEIGHT / gridGap)}, (_, i) => (
          <line
            key={`h-${i}`}
            x1={0}
            y1={i * gridGap}
            x2={WIDTH}
            y2={i * gridGap}
            stroke={gridColor}
            strokeWidth={1}
          />
        )),
        <polyline
          key="chart"
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={c1}
          strokeWidth={7}
        />,
        ...points.map((p, i) => (
          <rect
            key={`n-${i}`}
            x={p.x - 10}
            y={p.y - 10}
            width={20}
            height={20}
            fill={i === points.length - 1 ? c2 : c1}
            transform={`rotate(45 ${p.x} ${p.y})`}
          />
        )),
      ],
      'grid',
    ),
  ]
}

function glyphLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const cx = 700 + rand() * 260
  const cy = 180 + rand() * 200
  const size = 380 + rand() * 200
  const isCircle = rand() < 0.4
  return [
    svgWrap(
      isCircle
        ? [
            <circle
              key="outline"
              cx={cx}
              cy={cy}
              r={size / 2}
              fill="none"
              stroke={alpha(c1, 0.5)}
              strokeWidth={26}
            />,
            <circle
              key="core"
              cx={cx + size * 0.42}
              cy={cy + size * 0.35}
              r={26}
              fill={c2}
            />,
          ]
        : [
            <rect
              key="outline"
              x={cx - size / 2}
              y={cy - size / 2}
              width={size}
              height={size}
              fill="none"
              stroke={alpha(c1, 0.5)}
              strokeWidth={26}
              transform={`rotate(45 ${cx} ${cy})`}
            />,
            <rect
              key="core"
              x={cx - 30}
              y={cy - 30}
              width={60}
              height={60}
              fill={c2}
              transform={`rotate(45 ${cx} ${cy})`}
            />,
          ],
      'glyph',
    ),
    band(ctx, 'base', {thin: true}),
    threadSvg(ctx, 3, 380, 560),
  ]
}

const LAYOUTS = [
  {fn: bandsLayout, canDark: true},
  {fn: ringsLayout, canDark: true},
  {fn: fieldLayout, canDark: true},
  {fn: columnsLayout, canDark: false},
  {fn: codePanelLayout, canDark: true, forceDarkBias: true},
  {fn: contoursLayout, canDark: true},
  {fn: gridChartLayout, canDark: true},
  {fn: glyphLayout, canDark: false},
]

interface Frag {
  text: string
  emphasis: boolean
}

function toWords(title: string): Frag[][] {
  const words: Frag[][] = [[]]
  for (const part of parseTitleEmphasis(title)) {
    part.text.split(' ').forEach((piece, idx) => {
      if (idx > 0) {
        words.push([])
      }
      if (piece) {
        words[words.length - 1].push({text: piece, emphasis: part.emphasis})
      }
    })
  }
  return words.filter((w) => w.length > 0)
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url)
  const slug = searchParams.get('slug') ?? 'yceffort'
  const title = searchParams.get('title')
  const tag = searchParams.get('tag')

  const hash = hashCode(slug)
  const rand = mulberry32(hash)
  const [c1, c2] = DUOS[hash % DUOS.length]

  const layout = LAYOUTS[Math.floor(rand() * LAYOUTS.length)]
  const dark = layout.canDark
    ? rand() < (layout.forceDarkBias ? 0.7 : 0.18)
    : false
  const ctx: Ctx = {rand, c1, c2, dark}

  const dot = {
    x: 60 + rand() * (WIDTH - 240),
    y: 60 + rand() * (HEIGHT - 220),
    size: 40 + rand() * 52,
  }

  let fontData: ArrayBuffer | undefined
  if (title) {
    const fontRes = await fetch(FONT_URL)
    if (fontRes.ok) {
      fontData = await fontRes.arrayBuffer()
    }
  }

  const paper = dark ? PAPER_DARK : PAPER_LIGHT
  const inkColor = dark ? '#f2f2f7' : INK
  const scrim = dark
    ? 'linear-gradient(180deg, rgba(13,13,20,0) 0%, rgba(13,13,20,0.88) 45%, rgba(13,13,20,0.97) 100%)'
    : 'linear-gradient(180deg, rgba(253,251,247,0) 0%, rgba(253,251,247,0.86) 45%, rgba(253,251,247,0.96) 100%)'

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        background: paper,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -180,
          right: -160,
          width: 560,
          height: 560,
          borderRadius: 9999,
          background: `radial-gradient(circle at center, ${alpha(c1, dark ? 0.28 : 0.22)} 0%, ${alpha(c1, 0)} 70%)`,
        }}
      />
      {layout.fn(ctx)}
      <div
        style={{
          position: 'absolute',
          left: dot.x,
          top: dot.y,
          width: dot.size,
          height: dot.size,
          borderRadius: 9999,
          background: c2,
          opacity: 0.9,
        }}
      />
      {title && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: HEIGHT * 0.75,
            background: scrim,
          }}
        />
      )}
      {title && (
        <div
          style={{
            position: 'absolute',
            left: 72,
            right: 72,
            bottom: 64,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {tag && (
            <div
              style={{
                display: 'flex',
                marginBottom: 22,
                fontSize: 23,
                letterSpacing: '0.22em',
                color: dark ? c1 : c2,
              }}
            >
              ◆ #{tag.toUpperCase()}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              fontSize: 66,
              fontWeight: 700,
              lineHeight: 1.28,
              letterSpacing: '-0.02em',
              color: inkColor,
            }}
          >
            {toWords(title).map((word, i) => (
              <div key={i} style={{display: 'flex', marginRight: 17}}>
                {word.map((frag, j) => (
                  <span
                    key={j}
                    style={
                      frag.emphasis
                        ? {
                            backgroundImage: `linear-gradient(120deg, ${c1} 0%, ${c2} 100%)`,
                            backgroundClip: 'text',
                            color: 'transparent',
                          }
                        : {}
                    }
                  >
                    {frag.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: fontData
        ? [
            {
              name: 'NanumGothic',
              data: fontData,
              style: 'normal' as const,
              weight: 700 as const,
            },
          ]
        : undefined,
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  )
}
