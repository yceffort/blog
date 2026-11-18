import {cacheLife} from 'next/cache'
import sharp from 'sharp'

import {loadThumbnail} from '@/utils/loadThumbnail'
import {findPostByYearAndSlug, getAllPosts} from '@/utils/Post'

// 주간 메일용 썸네일. Outlook 윈도우는 WebP를 못 읽고 실사 PNG 원본은 수백 KB라,
// 폭을 줄여 일러스트는 PNG, 실사는 JPEG로 내보낸다
const WIDTH = 680

const extensionOf = (thumbnail: string) =>
  new URL(thumbnail, 'https://yceffort.kr').pathname.endsWith('.png')
    ? 'jpg'
    : 'png'

export async function generateStaticParams() {
  return (await getAllPosts('ko')).flatMap(({frontMatter, fields}) =>
    frontMatter.thumbnail
      ? [
          {
            path: `${fields.slug}.${extensionOf(frontMatter.thumbnail)}`.split(
              '/',
            ),
          },
        ]
      : [],
  )
}

// 파일 읽기가 있으면 Cache Components가 정적 생성을 멈추므로 캐시 함수 안에서 그린다
async function renderEmailThumbnail(year: string, slug: string[], ext: string) {
  'use cache'
  cacheLife('max')

  const thumbnail = (await findPostByYearAndSlug(year, slug, 'ko'))?.frontMatter
    .thumbnail
  if (!thumbnail || extensionOf(thumbnail) !== ext) {
    return null
  }
  const image = sharp(await loadThumbnail(thumbnail)).resize({width: WIDTH})
  const buffer =
    ext === 'jpg'
      ? await image.jpeg({quality: 82, mozjpeg: true}).toBuffer()
      : await image.png({palette: true, compressionLevel: 9}).toBuffer()
  return new Uint8Array(buffer)
}

export async function GET(
  _request: Request,
  {params}: RouteContext<'/newsletter/thumb/[...path]'>,
) {
  const {path: segments} = await params
  const match = /^(\d{4})\/(.+)\.(png|jpg)$/.exec(segments.join('/'))
  if (!match) {
    return new Response('Not found', {status: 404})
  }
  const [, year, slug, ext] = match
  const body = await renderEmailThumbnail(year, slug.split('/'), ext)
  if (!body) {
    return new Response('Not found', {status: 404})
  }
  return new Response(body, {
    headers: {'Content-Type': ext === 'jpg' ? 'image/jpeg' : 'image/png'},
  })
}
