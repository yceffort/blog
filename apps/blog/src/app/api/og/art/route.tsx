import {parseTitleEmphasis} from '@yceffort/shared/utils'
import {ImageResponse} from 'next/og'

import {unblockSvgLoader} from '@/utils/ogSharpUnblock'

import {LAYOUTS, LAYOUT_BY_NAME, HEIGHT, INK, WIDTH, alpha} from './layouts'
import type {Ctx} from './layouts'

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
  ['#fb923c', '#b45309'],
  ['#818cf8', '#ec4899'],
  ['#2dd4bf', '#0f766e'],
  ['#facc15', '#ea580c'],
  ['#e879f9', '#4c1d95'],
  ['#94a3b8', '#334155'],
]

interface Paper {
  bg: string
  scrim: string
  dark: boolean
}

const PAPERS: {paper: Paper; weight: number}[] = [
  {
    paper: {
      bg: 'linear-gradient(160deg, #fdfbf7 0%, #faf5ec 55%, #f9f0f2 100%)',
      scrim: '253, 251, 247',
      dark: false,
    },
    weight: 25,
  },
  {
    paper: {
      bg: 'linear-gradient(160deg, #fdf8f6 0%, #fbeee9 60%, #f9edf1 100%)',
      scrim: '253, 246, 243',
      dark: false,
    },
    weight: 15,
  },
  {
    paper: {
      bg: 'linear-gradient(160deg, #f7fbf7 0%, #ecf6ef 60%, #eaf4f2 100%)',
      scrim: '245, 250, 246',
      dark: false,
    },
    weight: 15,
  },
  {
    paper: {
      bg: 'linear-gradient(160deg, #f9f8fd 0%, #f0eefa 60%, #f2edf7 100%)',
      scrim: '248, 247, 252',
      dark: false,
    },
    weight: 15,
  },
  {
    paper: {
      bg: 'linear-gradient(160deg, #14141d 0%, #0d0d14 60%, #12101a 100%)',
      scrim: '13, 13, 20',
      dark: true,
    },
    weight: 20,
  },
  {
    paper: {
      bg: 'linear-gradient(160deg, #1a1218 0%, #120c12 60%, #170f19 100%)',
      scrim: '18, 12, 18',
      dark: true,
    },
    weight: 10,
  },
]

function pickPaper(rand: () => number): Paper {
  const total = PAPERS.reduce((sum, p) => sum + p.weight, 0)
  let roll = rand() * total
  for (const {paper, weight} of PAPERS) {
    roll -= weight
    if (roll <= 0) {
      return paper
    }
  }
  return PAPERS[0].paper
}

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

// frontmatter `art.hue` → DUOS 인덱스 후보. 실제 팔레트는 후보 안에서 해시로 고른다
const HUES: Record<string, number[]> = {
  warm: [0, 4, 10, 13],
  rose: [5, 8],
  violet: [1, 7, 11, 14],
  blue: [2, 6],
  cyan: [9, 12],
  green: [3, 12],
  slate: [15],
}

function estimateWidthUnits(text: string): number {
  let units = 0
  for (const ch of text) {
    units += ch.charCodeAt(0) > 0x2e7f ? 1 : 0.62
  }
  return units
}

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
  unblockSvgLoader()
  const {searchParams} = new URL(request.url)
  const slug = searchParams.get('slug') ?? 'yceffort'
  const title = searchParams.get('title')
  const tag = searchParams.get('tag')
  const layoutName = searchParams.get('layout')
  const hueName = searchParams.get('hue')
  const tone = searchParams.get('tone')
  const hero = searchParams.get('hero')?.slice(0, 26) || null

  const hash = hashCode(slug)
  const rand = mulberry32(hash)
  const hueIndices = (hueName && HUES[hueName]) || null
  const [c1, c2] = hueIndices
    ? DUOS[hueIndices[hash % hueIndices.length]]
    : DUOS[hash % DUOS.length]

  const layoutRoll = Math.floor(rand() * LAYOUTS.length)
  const layout =
    (layoutName && LAYOUT_BY_NAME[layoutName]) || LAYOUTS[layoutRoll]
  const rolledPaper = pickPaper(rand)
  const wantDark = tone === 'dark' ? true : tone === 'light' ? false : null
  const paper = (() => {
    if (wantDark === null || rolledPaper.dark === wantDark) {
      return rolledPaper
    }
    const candidates = PAPERS.filter((p) => p.paper.dark === wantDark)
    return candidates[hash % candidates.length].paper
  })()
  const dark = paper.dark
  const ctx: Ctx = {rand, c1, c2, dark}

  const blobCorner = Math.floor(rand() * 4)

  let fontData: ArrayBuffer | undefined
  if (title || hero || layout === LAYOUT_BY_NAME.glyph) {
    const fontRes = await fetch(FONT_URL)
    if (fontRes.ok) {
      fontData = await fontRes.arrayBuffer()
    }
  }

  const inkColor = dark ? '#f2f2f7' : INK
  const scrim = `linear-gradient(180deg, rgba(${paper.scrim}, 0) 0%, rgba(${paper.scrim}, 0.88) 45%, rgba(${paper.scrim}, 0.97) 100%)`

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        position: 'relative',
        background: paper.bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: blobCorner < 2 ? -180 : HEIGHT - 380,
          left: blobCorner % 2 === 0 ? -160 : WIDTH - 400,
          width: 560,
          height: 560,
          borderRadius: 9999,
          background: `radial-gradient(circle at center, ${alpha(c1, dark ? 0.28 : 0.22)} 0%, ${alpha(c1, 0)} 70%)`,
        }}
      />
      {layout(ctx)}
      {hero && !title && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 300,
            background: `linear-gradient(180deg, rgba(${paper.scrim}, 0) 0%, rgba(${paper.scrim}, 0.85) 55%, rgba(${paper.scrim}, 0.97) 100%)`,
          }}
        />
      )}
      {hero && !title && (
        <div
          style={{
            position: 'absolute',
            // 목록 행(3:2)이 좌우 127px를 잘라내므로 그 안쪽에 둔다
            left: 164,
            bottom: 56,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              marginRight: 22,
              background: c2,
              transform: 'rotate(45deg)',
              display: 'flex',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: Math.min(104, 820 / estimateWidthUnits(hero)),
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: inkColor,
            }}
          >
            {hero}
          </div>
        </div>
      )}
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
