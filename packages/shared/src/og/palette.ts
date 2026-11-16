// scripts/undraw-thumbnail.mjs의 ACCENT, PAPER와 같은 값이어야 썸네일 바탕색으로 hue를 알아낼 수 있다
export const ACCENT = {
  warm: '#d97706',
  rose: '#be185d',
  violet: '#6d28d9',
  blue: '#1d4ed8',
  cyan: '#0e7490',
  green: '#047857',
  slate: '#334155',
} as const

export const PAPER: Record<Hue, string> = {
  warm: '#fbf6ee',
  rose: '#fbf1f4',
  violet: '#f4f1fb',
  blue: '#eff4fb',
  cyan: '#edf7f8',
  green: '#eef8f2',
  slate: '#f3f4f6',
}

export type Hue = keyof typeof ACCENT

const HUES = Object.keys(ACCENT) as Hue[]

// undraw-thumbnail.mjs가 art.hue 없는 글에 색을 고르는 규칙과 같다
export function hueFor(seed: string): Hue {
  let h = 0
  for (const ch of seed) {
    h = (h * 31 + ch.charCodeAt(0)) | 0
  }
  return HUES[Math.abs(h) % HUES.length]
}

export function hueOfPaper([r, g, b]: number[]): Hue | undefined {
  return HUES.find((hue) => {
    const hex = PAPER[hue]
    return [1, 3, 5].every(
      (i, k) => Math.abs(parseInt(hex.slice(i, i + 2), 16) - [r, g, b][k]) <= 3,
    )
  })
}
