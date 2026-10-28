export const OG_FONT_URL =
  'https://cdn.jsdelivr.net/gh/fonts-archive/NanumGothic/NanumGothicBold.ttf'

let cached: ArrayBuffer | undefined

// OG 이미지마다 같은 글꼴을 다시 받지 않도록 인스턴스 안에서 재사용한다.
// 응답이 실패하면 undefined를 돌려주고, 네트워크 오류는 그대로 던진다.
export async function loadOgFont(): Promise<ArrayBuffer | undefined> {
  if (cached) {
    return cached
  }
  const res = await fetch(OG_FONT_URL)
  if (!res.ok) {
    return undefined
  }
  cached = await res.arrayBuffer()
  return cached
}
