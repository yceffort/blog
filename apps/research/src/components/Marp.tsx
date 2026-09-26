'use client'

import {useMarpShadowRoot} from '@/hooks/useMarpShadowRoot'

import {slideFrame} from './MarpSlides.styles'

interface RenderedMarp {
  html: string[]
  css: string
  fonts: string[]
}

interface MarpProps {
  border?: boolean
  className?: string
  fit?: 'width' | 'contain'
  rendered: RenderedMarp
  page?: number
}

const HOST_CSS = `
  :host {
    all: initial;
  }
  :host > [data-marpit-svg] {
    vertical-align: top;
  }
  /* 발표자 화면에서는 가용 높이도 제한한다. SVG의 viewBox가 비율을 유지한다. */
  :host([data-fit='contain']) {
    display: block;
    width: 100%;
    height: 100%;
  }
  :host([data-fit='contain']) > [data-marpit-svg] {
    display: block;
    width: 100%;
    height: 100%;
  }
  section {
    padding: var(--marp-slide-padding, 30px 40px) !important;
  }
  /* 터치 기기의 롱프레스는 컨텍스트 메뉴용이다. 텍스트 선택과 iOS 콜아웃이 겹치지 않게 막는다 */
  @media (pointer: coarse) {
    section {
      -webkit-touch-callout: none;
      user-select: none;
    }
  }
`

// mermaid는 크므로 다이어그램이 있는 슬라이드에서만 불러오고, 초기화는 한 번만 한다
let mermaidPromise: Promise<typeof import('mermaid').default> | undefined
function loadMermaid() {
  mermaidPromise ??= import('mermaid').then(({default: mermaid}) => {
    mermaid.initialize({
      startOnLoad: false,
      layout: 'dagre',
      look: 'classic',
      theme: 'default',
      securityLevel: 'loose',
    })
    return mermaid
  })
  return mermaidPromise
}

let mermaidSeq = 0

function renderMermaid(shadowRoot: ShadowRoot) {
  // 이미 렌더된 요소를 다시 파싱하면 SVG 내부 텍스트가 정의로 넘어가 에러가 난다
  const elements = [
    ...shadowRoot.querySelectorAll<HTMLElement>('.mermaid'),
  ].filter((el) => !el.querySelector('svg') && el.textContent?.trim())
  let cancelled = false

  const run = async () => {
    const mermaid = await loadMermaid()
    for (const element of elements) {
      if (cancelled) {
        return
      }
      try {
        const {svg} = await mermaid.render(
          `mermaid-${++mermaidSeq}`,
          element.textContent || '',
        )
        element.innerHTML = svg
      } catch (error) {
        element.style.color = 'red'
        element.textContent = `Mermaid Error: ${String(error)}`
      }
    }
  }
  if (elements.length > 0) {
    void run()
  }

  return () => {
    cancelled = true
  }
}

export function Marp({
  border = true,
  className,
  fit = 'width',
  rendered,
  page = 1,
}: MarpProps) {
  const {html, css, fonts} = rendered
  const hostRef = useMarpShadowRoot(
    html[page - 1] || '',
    css,
    fonts,
    HOST_CSS,
    renderMermaid,
  )

  return (
    <div
      className={[border ? slideFrame : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <span ref={hostRef} data-fit={fit} />
    </div>
  )
}
