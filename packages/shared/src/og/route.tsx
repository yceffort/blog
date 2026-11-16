import {ImageResponse} from 'next/og'
import sharp from 'sharp'

import {loadOgFont, OG_FONT_NAME} from './font'
import {ACCENT, type Hue, hueFor, hueOfPaper, PAPER} from './palette'
import {unblockSvgLoader} from './sharp'

export interface OgImageContent {
  // <em>으로 감싼 부분은 강조색으로 그린다
  title: string
  // 왼쪽 아래에 작게 붙는 사이트 표식
  mark: string
  // 썸네일이 없거나 unDraw 썸네일이 아닐 때 바탕색을 고르는 값
  seed: string
  // 글 썸네일(WebP, PNG). unDraw 바탕색이면 그림만 잘라 쓰고, 아니면 카드로 넣는다
  image?: Buffer
}

const WIDTH = 1200
const HEIGHT = 630
const INK = '#16161d'

type Part = {text: string; em: boolean}

// 한국어 제목은 keep-all이라 띄어쓰기 단위로 줄을 바꾼다. 강조 경계에 공백이 없으면 한 단어로 묶는다
function titleWords(title: string): Part[][] {
  const words: Part[][] = []
  let joined = false
  for (const m of title.matchAll(/<em>(.*?)<\/em>|([^<]+)/g)) {
    const em = m[1] !== undefined
    for (const piece of (m[1] ?? m[2]).split(/(\s+)/)) {
      if (!piece) {
        continue
      }
      if (/^\s+$/.test(piece)) {
        joined = false
        continue
      }
      if (joined) {
        words[words.length - 1].push({text: piece, em})
      } else {
        words.push([{text: piece, em}])
      }
      joined = true
    }
  }
  return words
}

function charWidth(ch: string) {
  if (/[ᄀ-ᇿ㄰-㆏　-鿿가-힯]/.test(ch)) {
    return 1
  }
  return /[A-Z0-9]/.test(ch) ? 0.62 : 0.52
}

function textWidth(text: string) {
  let width = 0
  for (const ch of text) {
    width += charWidth(ch)
  }
  return width
}

// 글자 폭을 어림해 maxLines 안에 들어가는 가장 큰 크기를 고른다
function titleSize(words: Part[][], width: number, sizes: number[]) {
  const maxLines = 4
  const fits = (size: number) => {
    let lines = 1
    let x = 0
    for (const word of words) {
      const w = textWidth(word.map((p) => p.text).join('')) * size
      if (x > 0 && x + w > width) {
        lines += 1
        x = 0
      }
      x += w + size * 0.28
    }
    return lines <= maxLines
  }
  return sizes.find(fits) ?? sizes[sizes.length - 1]
}

const toDataUrl = (png: Buffer) =>
  `data:image/png;base64,${png.toString('base64')}`

async function visualOf(image: Buffer, seed: string) {
  const corner = await sharp(image)
    .extract({left: 0, top: 0, width: 1, height: 1})
    .raw()
    .toBuffer()
  const hue = hueOfPaper([...corner])
  if (hue) {
    // unDraw 썸네일은 바탕색 위에 그림을 가운데 둔 것이라, 여백을 잘라 그림만 쓴다
    const illustration = await sharp(image)
      .trim({threshold: 4})
      .png()
      .toBuffer()
    return {
      hue,
      src: toDataUrl(illustration),
      width: 420,
      height: 400,
      borderRadius: 0,
      objectFit: 'contain' as const,
    }
  }
  // 사진이나 코드 아트는 바탕색이 달라 둥근 카드로 넣는다. satori는 WebP를 그리지 못하므로 PNG로 바꾼다
  const png = await sharp(image).png().toBuffer()
  const {width, height} = await sharp(png).metadata()
  return {
    hue: hueFor(seed),
    src: toDataUrl(png),
    width: 440,
    height: Math.min(440, Math.round((440 * height) / width)),
    borderRadius: 24,
    objectFit: 'cover' as const,
  }
}

// 요청 없이도 그릴 수 있게 분리했다. 블로그는 빌드 때 글마다 이 함수로 PNG를 만든다
export async function renderOgImage({
  title,
  mark,
  seed,
  image,
}: OgImageContent) {
  unblockSvgLoader()
  const visual = image ? await visualOf(image, seed) : undefined
  const hue: Hue = visual?.hue ?? hueFor(seed)
  const words = titleWords(title)
  const titleWidth = visual ? 560 : WIDTH - 96 * 2
  const size = titleSize(
    words,
    titleWidth,
    visual ? [58, 52, 46, 40] : [72, 64, 56, 48],
  )

  const fontData = await loadOgFont()
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: visual ? '0 72px 0 96px' : '0 96px',
        backgroundColor: PAPER[hue],
        fontFamily: OG_FONT_NAME,
      }}
    >
      <div
        style={{display: 'flex', flexDirection: 'column', width: titleWidth}}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: size,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: '-0.03em',
            color: INK,
          }}
        >
          {words.map((word, i) => (
            <div key={i} style={{display: 'flex', marginRight: size * 0.28}}>
              {word.map((part, j) => (
                <span key={j} style={{color: part.em ? ACCENT[hue] : INK}}>
                  {part.text}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 40,
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: `${INK}99`,
          }}
        >
          {mark}
        </div>
      </div>

      {visual ? (
        <img
          alt=""
          src={visual.src}
          style={{
            width: visual.width,
            height: visual.height,
            borderRadius: visual.borderRadius,
            objectFit: visual.objectFit,
          }}
        />
      ) : null}
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {name: OG_FONT_NAME, data: fontData, style: 'normal', weight: 700},
      ],
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    },
  )
}

// 각 앱의 app/api/og/route.tsx에서 `export const GET = createOgImageRoute(SiteConfig.url)`로 쓴다.
// thumbnail이 있으면 오른쪽에 그리고, 없으면 제목만 그린다
export function createOgImageRoute(siteUrl: string) {
  return async function GET(request: Request) {
    try {
      const {searchParams} = new URL(request.url)
      const title = searchParams.get('title')
      if (!title) {
        return new Response('Missing title', {
          status: 400,
        })
      }

      const thumbnailParam = searchParams.get('thumbnail')
      let image: Buffer | undefined
      if (thumbnailParam) {
        const protocol = request.headers.get('x-forwarded-proto') || 'http'
        const host = request.headers.get('host')
        const baseUrl = `${protocol}://${host}`
        const imageUrl = new URL(thumbnailParam, baseUrl)
        // thumbnail은 이 사이트의 경로만 받는다. 이어 붙이면 `.evil.com/x.png`로 호스트가 바뀐다
        if (imageUrl.origin !== new URL(baseUrl).origin) {
          return new Response('Invalid thumbnail', {status: 400})
        }
        const imageRes = await fetch(imageUrl)
        if (!imageRes.ok) {
          throw new Error(`Failed to fetch image: ${imageUrl}`)
        }
        image = Buffer.from(await imageRes.arrayBuffer())
      }

      return await renderOgImage({
        title,
        mark: new URL(siteUrl).host,
        seed: searchParams.get('path') ?? title,
        image,
      })
    } catch (e: unknown) {
      return new Response(
        `Failed to generate the image: ${e instanceof Error ? e.message : 'Unknown error'}`,
        {
          status: 500,
        },
      )
    }
  }
}
