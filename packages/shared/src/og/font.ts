import {readFile} from 'node:fs/promises'
import path from 'node:path'

export const OG_FONT_NAME = 'Pretendard'

const cached = new Map<700 | 900, ArrayBuffer>()

// 경로는 앱 디렉터리(apps/*) 기준이고, 각 앱 next.config의 outputFileTracingIncludes가 이 파일을 함수에 싣는다.
// 경로를 변수로 넘기면 Next가 프로젝트 전체를 함수에 싣으므로 굵기마다 문자열 경로로 읽는다
function readFont(weight: 700 | 900) {
  if (weight === 900) {
    return readFile(
      path.join(
        process.cwd(),
        '../../packages/shared/src/og/fonts/Pretendard-Black.otf',
      ),
    )
  }
  return readFile(
    path.join(
      process.cwd(),
      '../../packages/shared/src/og/fonts/Pretendard-Bold.otf',
    ),
  )
}

// OG 이미지마다 같은 글꼴을 다시 읽지 않도록 인스턴스 안에서 재사용한다
export async function loadOgFont(
  weight: 700 | 900 = 700,
): Promise<ArrayBuffer> {
  const hit = cached.get(weight)
  if (hit) {
    return hit
  }
  const file = await readFont(weight)
  const data = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  )
  cached.set(weight, data)
  return data
}
