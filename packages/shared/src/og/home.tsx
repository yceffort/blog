import {ImageResponse} from 'next/og'

import {loadOgFont, OG_FONT_NAME} from './font'

export interface HomeOgContent {
  // 위에 작게 붙는 머리말. 각 사이트 히어로의 eyebrow와 같은 문구를 조각으로 나눠 간격을 두고 그린다
  eyebrow: string[]
  // 히어로 세 줄. accent는 그라데이션, muted는 흐린 문장부호
  lines: {text: string; tone?: 'accent' | 'muted'}[][]
  // 아래 왼쪽 숫자 [값, 이름]
  stats: [string, string][]
  host: string
  // 한글 줄은 영문보다 넓어 크기를 줄인다
  size?: number
}

// 사이트 어두운 테마(theme.css의 --bg, --ink, --ink-4, --primary*)와 같은 값
const BG = '#0a0a0f'
const INK = '#f5f5fa'
const INK_4 = '#5c5c73'
const P1 = '#818cf8'
const P2 = '#a78bfa'
const P3 = '#f472b6'
const GRADIENT = `linear-gradient(120deg, ${P1} 0%, ${P2} 50%, ${P3} 100%)`

// 각 사이트 / 의 OG. 홈 히어로를 그대로 옮긴다
export async function renderHomeOgImage({
  eyebrow,
  lines,
  stats,
  host,
  size = 128,
}: HomeOgContent) {
  const [bold, black] = await Promise.all([loadOgFont(700), loadOgFont(900)])
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        position: 'relative',
        padding: '64px 88px',
        backgroundColor: BG,
        fontFamily: OG_FONT_NAME,
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: -160,
          top: -200,
          width: 640,
          height: 640,
          borderRadius: 640,
          backgroundImage: `radial-gradient(circle, ${P2}33 0%, ${BG}00 70%)`,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '0.14em',
          color: P1,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 12,
            height: 12,
            marginRight: 14,
            borderRadius: 12,
            backgroundColor: P3,
          }}
        />
        {eyebrow.map((part) => (
          <span key={part} style={{marginRight: 28}}>
            {part}
          </span>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: size,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: '-0.045em',
          color: INK,
        }}
      >
        {lines.map((line, i) => (
          <div key={i} style={{display: 'flex'}}>
            {line.map((part, j) => (
              <span
                key={j}
                style={
                  part.tone === 'accent'
                    ? {
                        paddingRight: '0.04em',
                        backgroundImage: GRADIENT,
                        backgroundClip: 'text',
                        color: 'transparent',
                      }
                    : part.tone === 'muted'
                      ? {marginLeft: '0.02em', fontWeight: 700, color: INK_4}
                      : {}
                }
              >
                {part.text}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: 24,
          fontWeight: 700,
          color: INK_4,
        }}
      >
        <div style={{display: 'flex'}}>
          {stats.map(([value, label]) => (
            <div
              key={label}
              style={{display: 'flex', alignItems: 'baseline', marginRight: 36}}
            >
              <span
                style={{
                  marginRight: 8,
                  fontSize: 30,
                  letterSpacing: '0.02em',
                  color: INK,
                }}
              >
                {value}
              </span>
              {label}
            </div>
          ))}
        </div>
        <div style={{display: 'flex', color: INK}}>{host}</div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {name: OG_FONT_NAME, data: bold, style: 'normal', weight: 700},
        {name: OG_FONT_NAME, data: black, style: 'normal', weight: 900},
      ],
    },
  )
}
