// Marp의 지역 class 지시문(`<!-- _class: hidden-slide -->`)으로 숨김 장을 표시한다.
// DOMParser 없이 서버와 브라우저에서 동일한 슬라이드 목록을 만든다.
export function getSlideGroups(html: readonly string[]) {
  const all: number[] = []
  const visible: number[] = []
  const hidden: number[] = []

  html.forEach((slide, index) => {
    const section = slide.match(/<section\b[^>]*>/i)?.[0] ?? ''
    const classes = section.match(/\sclass=["']([^"']*)["']/i)?.[1] ?? ''
    all.push(index)
    if (classes.split(/\s+/).includes('hidden-slide')) {
      hidden.push(index)
    } else {
      visible.push(index)
    }
  })

  return {all, visible, hidden}
}
