import {readFile} from 'node:fs/promises'
import path from 'node:path'

let cached: ArrayBuffer | undefined

// OG 이미지마다 같은 글꼴을 다시 읽지 않도록 인스턴스 안에서 재사용한다.
// 경로는 앱 디렉터리(apps/*) 기준이고, 각 앱 next.config의 outputFileTracingIncludes가 이 파일을 함수에 싣는다
export async function loadOgFont(): Promise<ArrayBuffer> {
  if (cached) {
    return cached
  }
  const file = await readFile(
    path.join(
      process.cwd(),
      '../../packages/shared/src/og/fonts/NanumGothicBold.ttf',
    ),
  )
  cached = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  return cached
}
