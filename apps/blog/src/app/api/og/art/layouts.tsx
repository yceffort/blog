import type {ReactNode} from 'react'

export const WIDTH = 1200
export const HEIGHT = 630
export const INK = '#0a0a0f'

export interface Ctx {
  rand: () => number
  c1: string
  c2: string
  dark: boolean
}

export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// hex 두 색을 t(0~1)로 섞는다. t=0이면 a, t=1이면 b
export function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16)
  const nb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => {
    const va = (na >> shift) & 255
    const vb = (nb >> shift) & 255
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${ch(16)}${ch(8)}${ch(0)}`
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

function inkOf(ctx: Ctx) {
  return ctx.dark ? '#f2f2f7' : INK
}

function paperOf(ctx: Ctx) {
  return ctx.dark ? '#12121a' : '#fbf8f2'
}

// 밝은 쪽/어두운 쪽으로 기울인 색. 종이색과 섞지 않아 채도가 유지된다
function tint(ctx: Ctx, hex: string, t: number) {
  return mix(hex, ctx.dark ? '#000000' : '#ffffff', t)
}

// bands: 겹겹이 쌓인 파도 층. 흐름, 스트리밍, 라이프사이클
export function wavesLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const layers = 7
  const phases = Array.from({length: layers}, () => rand() * 600)
  const paths = Array.from({length: layers}, (_, i) => {
    const t = i / (layers - 1)
    const baseY = 120 + t * 430
    const amp = 40 + rand() * 50
    const wl = 260 + rand() * 260
    const pts: string[] = []
    for (let x = -40; x <= WIDTH + 40; x += 20) {
      const y =
        baseY +
        Math.sin(((x + phases[i]) / wl) * Math.PI * 2) * amp +
        Math.sin(((x * 2.3 + phases[i]) / wl) * Math.PI * 2) * amp * 0.3
      pts.push(`${x},${y}`)
    }
    const fill = tint(ctx, mix(c1, c2, t), 0.05 + (1 - t) * 0.5)
    return (
      <polygon
        key={i}
        points={`-40,${HEIGHT + 40} ${pts.join(' ')} ${WIDTH + 40},${HEIGHT + 40}`}
        fill={fill}
      />
    )
  })
  return [svgWrap(paths, 'waves')]
}

// rings: 궤도와 위성. 캐시, 레이어, 스코프
export function orbitLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const ink = inkOf(ctx)
  const cx = 700 + rand() * 300
  const cy = 200 + rand() * 230
  const orbits = 6 + Math.floor(rand() * 3)
  const nodes: ReactNode[] = []
  const rings: ReactNode[] = []
  for (let i = 0; i < orbits; i++) {
    const r = 70 + i * (62 + rand() * 12)
    const dashed = rand() < 0.35
    rings.push(
      <ellipse
        key={`o-${i}`}
        cx={cx}
        cy={cy}
        rx={r * 1.25}
        ry={r}
        fill="none"
        stroke={alpha(i % 2 === 0 ? c1 : ink, i === 0 ? 0.9 : 0.5)}
        strokeWidth={i === 0 ? 8 : 3}
        strokeDasharray={dashed ? '14 18' : undefined}
      />,
    )
    const satellites = 1 + Math.floor(rand() * 3)
    for (let k = 0; k < satellites; k++) {
      const th = rand() * Math.PI * 2
      const sr = 8 + rand() * 24
      nodes.push(
        <circle
          key={`s-${i}-${k}`}
          cx={cx + Math.cos(th) * r * 1.25}
          cy={cy + Math.sin(th) * r}
          r={sr}
          fill={k === 0 ? c2 : c1}
        />,
      )
    }
  }
  const core = (
    <circle key="core" cx={cx} cy={cy} r={44 + rand() * 20} fill={c2} />
  )
  return [svgWrap([...rings, core, ...nodes], 'orbit')]
}

// field: 노드와 간선의 네트워크. 분산, 다수 인스턴스, 의존 관계
export function networkLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const ink = inkOf(ctx)
  const count = 46 + Math.floor(rand() * 16)
  const nodes = Array.from({length: count}, () => ({
    x: 30 + rand() * (WIDTH - 60),
    y: 30 + rand() * (HEIGHT - 60),
    r: 6 + rand() * rand() * 40,
  }))
  const edges: ReactNode[] = []
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({j, d: Math.hypot(m.x - n.x, m.y - n.y)}))
      .filter(({j}) => j !== i)
      .toSorted((a, b) => a.d - b.d)
      .slice(0, 3)
    for (const {j} of near) {
      if (j < i) {
        continue
      }
      const m = nodes[j]
      edges.push(
        <line
          key={`e-${i}-${j}`}
          x1={n.x}
          y1={n.y}
          x2={m.x}
          y2={m.y}
          stroke={alpha(c1, 0.55)}
          strokeWidth={3}
        />,
      )
    }
  })
  const dots = nodes.map((n, i) => (
    <circle
      key={`n-${i}`}
      cx={n.x}
      cy={n.y}
      r={n.r}
      fill={i % 7 === 0 ? c2 : i % 5 === 0 ? ink : c1}
    />
  ))
  return [svgWrap([...edges, ...dots], 'network')]
}

// columns: 아이소메트릭 블록 더미. 플랫폼, 인프라, 컨테이너
export function isometricLayout(ctx: Ctx) {
  const {rand, c1, c2, dark} = ctx
  const s = 64 + rand() * 20
  const cols = 6
  const rows = 5
  const originX = 640 + rand() * 160
  const originY = 120 + rand() * 60
  const heights: number[][] = Array.from({length: rows}, () =>
    Array.from({length: cols}, () =>
      rand() < 0.2 ? 0 : 1 + Math.floor(rand() * 4),
    ),
  )
  const top = mix(c1, '#ffffff', dark ? 0.35 : 0.55)
  const left = c1
  const right = mix(c2, '#000000', 0.25)
  const cubes: ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = heights[r][c]
      const bx = originX + (c - r) * s
      const by = originY + (c + r) * (s / 2)
      for (let k = 0; k < h; k++) {
        const y = by - k * s
        const key = `${r}-${c}-${k}`
        cubes.push(
          <polygon
            key={`${key}-t`}
            points={`${bx},${y - s / 2} ${bx + s},${y} ${bx},${y + s / 2} ${bx - s},${y}`}
            fill={top}
          />,
          <polygon
            key={`${key}-l`}
            points={`${bx - s},${y} ${bx},${y + s / 2} ${bx},${y + s / 2 + s} ${bx - s},${y + s}`}
            fill={left}
          />,
          <polygon
            key={`${key}-r`}
            points={`${bx + s},${y} ${bx},${y + s / 2} ${bx},${y + s / 2 + s} ${bx + s},${y + s}`}
            fill={right}
          />,
        )
      }
    }
  }
  return [svgWrap(cubes, 'iso')]
}

// codePanel: 화면을 꽉 채운 에디터. 코드 딥다이브, 린트 규칙, API
export function editorLayout(ctx: Ctx) {
  const {rand, c1, c2, dark} = ctx
  const ink = inkOf(ctx)
  const lineH = 42
  const lines = Math.ceil(HEIGHT / lineH) + 1
  const gutter = 96
  const diffStart = 3 + Math.floor(rand() * 6)
  const diffLen = 2 + Math.floor(rand() * 4)
  const muted = alpha(ink, dark ? 0.28 : 0.18)
  const rows: ReactNode[] = []
  let indent = 0
  for (let i = 0; i < lines; i++) {
    const y = 10 + i * lineH
    const inDiff = i >= diffStart && i < diffStart + diffLen
    const added = inDiff && rand() < 0.6
    if (inDiff) {
      rows.push(
        <rect
          key={`d-${i}`}
          x={0}
          y={y - 8}
          width={WIDTH}
          height={lineH}
          fill={alpha(added ? c1 : c2, 0.16)}
        />,
      )
      rows.push(
        <rect
          key={`m-${i}`}
          x={gutter - 26}
          y={y}
          width={14}
          height={22}
          fill={added ? c1 : c2}
        />,
      )
    }
    rows.push(
      <rect
        key={`g-${i}`}
        x={20}
        y={y + 4}
        width={28 + rand() * 12}
        height={14}
        rx={7}
        fill={muted}
      />,
    )
    const r = rand()
    indent = Math.max(
      0,
      Math.min(4, indent + (r < 0.3 ? 1 : r < 0.55 ? -1 : 0)),
    )
    let x = gutter + 20 + indent * 48
    const segs = 1 + Math.floor(rand() * 4)
    for (let k = 0; k < segs; k++) {
      const w = 50 + rand() * 170
      const roll = rand()
      const color = roll < 0.3 ? c1 : roll < 0.5 ? c2 : muted
      rows.push(
        <rect
          key={`s-${i}-${k}`}
          x={x}
          y={y}
          width={w}
          height={22}
          rx={11}
          fill={color}
        />,
      )
      x += w + 18
    }
  }
  rows.unshift(
    <rect
      key="gutter"
      x={0}
      y={0}
      width={gutter - 30}
      height={HEIGHT}
      fill={alpha(ink, 0.05)}
    />,
  )
  return [svgWrap(rows, 'editor')]
}

// contours: 채워진 등고선. 성능, 지형, 시간 축
export function topoLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const cx = 300 + rand() * 600
  const cy = 200 + rand() * 250
  const layers = 11
  const phases = Array.from({length: 4}, () => rand() * Math.PI * 2)
  const amps = Array.from({length: 4}, () => 0.05 + rand() * 0.07)
  const rings = Array.from({length: layers}, (_, i) => {
    const k = layers - 1 - i
    const base = 60 + k * 64
    const pts: string[] = []
    for (let a = 0; a < 80; a++) {
      const th = (a / 80) * Math.PI * 2
      let n = 0
      for (let f = 0; f < 4; f++) {
        n += Math.sin(th * (f + 2) + phases[f] + k * 0.35) * amps[f]
      }
      const r = base * (1 + n)
      pts.push(`${cx + Math.cos(th) * r * 1.4},${cy + Math.sin(th) * r}`)
    }
    const t = k / (layers - 1)
    const fill = k === 0 ? c2 : tint(ctx, mix(c1, c2, 1 - t), t * 0.75)
    return <polygon key={k} points={pts.join(' ')} fill={fill} />
  })
  return [svgWrap(rings, 'topo')]
}

// gridChart: 면 그래프와 막대. 실측 데이터, 벤치마크
export function chartLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const ink = inkOf(ctx)
  const n = 9 + Math.floor(rand() * 5)
  const barW = WIDTH / n
  const bars = Array.from({length: n}, (_, i) => {
    const h = 80 + rand() * 380 + (rand() < 0.6 ? i * 12 : 0)
    return {x: i * barW, h}
  })
  const gridLines = Array.from({length: 7}, (_, i) => (
    <line
      key={`h-${i}`}
      x1={0}
      y1={i * 90 + 30}
      x2={WIDTH}
      y2={i * 90 + 30}
      stroke={alpha(ink, 0.12)}
      strokeWidth={2}
    />
  ))
  const rects = bars.map((b, i) => (
    <rect
      key={`b-${i}`}
      x={b.x + 10}
      y={HEIGHT - b.h}
      width={barW - 20}
      height={b.h}
      fill={i === n - 1 ? c2 : alpha(c1, 0.5 + (i / n) * 0.5)}
    />
  ))
  const linePts = bars.map(
    (b) => `${b.x + barW / 2},${HEIGHT - b.h - 60 - rand() * 80}`,
  )
  const area = (
    <polygon
      key="area"
      points={`0,${HEIGHT} ${linePts.join(' ')} ${WIDTH},${HEIGHT}`}
      fill={alpha(c2, 0.18)}
    />
  )
  const line = (
    <polyline
      key="line"
      points={linePts.join(' ')}
      fill="none"
      stroke={ink}
      strokeWidth={7}
    />
  )
  const dots = linePts.map((p, i) => {
    const [x, y] = p.split(',').map(Number)
    return <circle key={`p-${i}`} cx={x} cy={y} r={11} fill={ink} />
  })
  return [svgWrap([...gridLines, ...rects, area, line, ...dots], 'chart')]
}

const GLYPHS = ['{ }', '</>', '=>', '( )', '#', '&&', '?.', '[ ]', '@', '%']

// glyph: 거대한 기호 하나. 단일 개념, 문법, 원리
export function glyphLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const glyph = GLYPHS[Math.floor(rand() * GLYPHS.length)]
  const size = 560 + rand() * 200
  const left = -40 + rand() * 300
  const top = -140 + rand() * 120
  return [
    <div
      key="glyph-shadow"
      style={{
        position: 'absolute',
        left: left + 22,
        top: top + 22,
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1,
        color: alpha(c2, 0.9),
        display: 'flex',
        whiteSpace: 'nowrap',
      }}
    >
      {glyph}
    </div>,
    <div
      key="glyph"
      style={{
        position: 'absolute',
        left,
        top,
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1,
        color: c1,
        display: 'flex',
        whiteSpace: 'nowrap',
      }}
    >
      {glyph}
    </div>,
  ]
}

// halftone: 망점이 만드는 큰 구체. 렌더링, 픽셀, 페인트
export function halftoneLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const gap = 40 + rand() * 10
  const cx = 500 + rand() * 400
  const cy = 150 + rand() * 300
  const R = 420 + rand() * 120
  const dots: ReactNode[] = []
  for (let x = gap / 2; x < WIDTH; x += gap) {
    for (let y = gap / 2; y < HEIGHT; y += gap) {
      const d = Math.hypot(x - cx, y - cy) / R
      const t = Math.max(0, 1 - d)
      const r = 2 + t * (gap * 0.55)
      if (r < 2.5) {
        continue
      }
      dots.push(
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={r}
          fill={t > 0.6 ? c2 : c1}
        />,
      )
    }
  }
  return [svgWrap(dots, 'halftone')]
}

// stripes: 화면을 가로지르는 사선 띠. 장애, 경고, 보안
export function hazardLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const ink = inkOf(ctx)
  const paper = paperOf(ctx)
  const angle = -30 - rand() * 30
  const spacing = 70 + rand() * 40
  const count = Math.ceil((WIDTH + HEIGHT * 2) / spacing) + 2
  const colors = [c1, c2, ink, c1]
  const stripes = Array.from({length: count}, (_, i) => (
    <rect
      key={`s-${i}`}
      x={-HEIGHT + i * spacing}
      y={-HEIGHT}
      width={spacing * (0.35 + rand() * 0.4)}
      height={HEIGHT * 3}
      fill={colors[i % colors.length]}
      opacity={i % 4 === 2 ? 0.5 : 0.9}
    />
  ))
  const holeX = 250 + rand() * 700
  const holeY = 150 + rand() * 250
  const hole = (
    <circle
      key="hole"
      cx={holeX}
      cy={holeY}
      r={120 + rand() * 90}
      fill={paper}
    />
  )
  const core = (
    <circle key="core" cx={holeX} cy={holeY} r={36 + rand() * 30} fill={c2} />
  )
  return [
    svgWrap(
      [
        <g key="g" transform={`rotate(${angle} ${WIDTH / 2} ${HEIGHT / 2})`}>
          {stripes}
        </g>,
        hole,
        core,
      ],
      'hazard',
    ),
  ]
}

// steps: 화면을 채우는 2.5D 계단. 마이그레이션, 단계, 성장
export function stairsLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const n = 5 + Math.floor(rand() * 3)
  const rising = rand() < 0.75
  const stepW = (WIDTH + 200) / n
  const depth = 26 + rand() * 20
  const shapes: ReactNode[] = []
  for (let i = 0; i < n; i++) {
    const level = rising ? i : n - 1 - i
    const h = 110 + level * ((HEIGHT - 160) / (n - 1))
    const x = -100 + i * stepW
    const y = HEIGHT - h
    const t = level / (n - 1)
    const face = tint(ctx, mix(c1, c2, t), 0.1)
    const side = mix(mix(c1, c2, t), '#000000', 0.3)
    const topc = mix(mix(c1, c2, t), '#ffffff', 0.45)
    shapes.push(
      <rect key={`f-${i}`} x={x} y={y} width={stepW} height={h} fill={face} />,
      <polygon
        key={`t-${i}`}
        points={`${x},${y} ${x + depth},${y - depth} ${x + stepW + depth},${y - depth} ${x + stepW},${y}`}
        fill={topc}
      />,
      <polygon
        key={`s-${i}`}
        points={`${x + stepW},${y} ${x + stepW + depth},${y - depth} ${x + stepW + depth},${HEIGHT} ${x + stepW},${HEIGHT}`}
        fill={side}
      />,
    )
  }
  return [svgWrap(shapes, 'stairs')]
}

// bauhaus: 기하 타일 모자이크. 설계, 조직, 에세이
export function mosaicLayout(ctx: Ctx) {
  const {rand, c1, c2} = ctx
  const ink = inkOf(ctx)
  const paper = paperOf(ctx)
  const cell = 150 + Math.floor(rand() * 2) * 60
  const cols = Math.ceil(WIDTH / cell)
  const rows = Math.ceil(HEIGHT / cell)
  const palette = [c1, c2, ink, paper, paper, mix(c1, paper, 0.6)]
  const tiles: ReactNode[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell
      const y = r * cell
      const bg = palette[Math.floor(rand() * palette.length)]
      let fg = palette[Math.floor(rand() * palette.length)]
      if (fg === bg) {
        fg = bg === c1 ? c2 : c1
      }
      const kind = Math.floor(rand() * 6)
      const key = `${r}-${c}`
      tiles.push(
        <rect
          key={`${key}-bg`}
          x={x}
          y={y}
          width={cell}
          height={cell}
          fill={bg}
        />,
      )
      if (kind === 0) {
        tiles.push(
          <circle
            key={`${key}-fg`}
            cx={x + cell / 2}
            cy={y + cell / 2}
            r={cell / 2}
            fill={fg}
          />,
        )
      } else if (kind === 1) {
        const q = Math.floor(rand() * 4)
        const ox = q % 2 === 0 ? x : x + cell
        const oy = q < 2 ? y : y + cell
        tiles.push(
          <path
            key={`${key}-fg`}
            d={`M ${ox} ${oy} m ${q % 2 === 0 ? cell : -cell} 0 A ${cell} ${cell} 0 0 ${q === 0 || q === 3 ? 1 : 0} ${ox} ${q < 2 ? oy + cell : oy - cell} Z`}
            fill={fg}
          />,
        )
      } else if (kind === 2) {
        const flip = rand() < 0.5
        tiles.push(
          <polygon
            key={`${key}-fg`}
            points={
              flip
                ? `${x},${y} ${x + cell},${y} ${x},${y + cell}`
                : `${x + cell},${y} ${x + cell},${y + cell} ${x},${y + cell}`
            }
            fill={fg}
          />,
        )
      } else if (kind === 3) {
        const vert = rand() < 0.5
        tiles.push(
          <path
            key={`${key}-fg`}
            d={
              vert
                ? `M ${x} ${y} A ${cell / 2} ${cell / 2} 0 0 1 ${x} ${y + cell} Z`
                : `M ${x} ${y + cell} A ${cell / 2} ${cell / 2} 0 0 1 ${x + cell} ${y + cell} Z`
            }
            fill={fg}
          />,
        )
      } else if (kind === 4) {
        tiles.push(
          <circle
            key={`${key}-fg`}
            cx={x + cell / 2}
            cy={y + cell / 2}
            r={cell / 5}
            fill={fg}
          />,
        )
      }
    }
  }
  return [svgWrap(tiles, 'mosaic')]
}

// frontmatter `art.layout` 이름 → 레이아웃. scripts/generate-art-spec.mjs 의 목록과 맞출 것
export const LAYOUT_BY_NAME: Record<string, (ctx: Ctx) => ReactNode[]> = {
  bands: wavesLayout,
  rings: orbitLayout,
  field: networkLayout,
  columns: isometricLayout,
  codePanel: editorLayout,
  contours: topoLayout,
  gridChart: chartLayout,
  glyph: glyphLayout,
  halftone: halftoneLayout,
  stripes: hazardLayout,
  bauhaus: mosaicLayout,
  steps: stairsLayout,
}

export const LAYOUTS = Object.values(LAYOUT_BY_NAME)
