import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {GET as renderArt} from '@/app/api/og/art/route'
import {SiteConfig} from '@/config'

// frontMatter.thumbnail(파일 경로나 코드 아트 URL)의 원본 이미지를 읽는다
export async function loadThumbnail(thumbnail: string) {
  const url = new URL(thumbnail, SiteConfig.url)
  if (url.pathname === '/api/og/art') {
    const res = await renderArt(new Request(url))
    return Buffer.from(await res.arrayBuffer())
  }
  return readFile(path.join(process.cwd(), 'public', url.pathname))
}
