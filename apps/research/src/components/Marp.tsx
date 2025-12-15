'use client'

import {useEffect, useRef} from 'react'

import classNames from 'classnames'
import mermaid from 'mermaid'

import {useFontFace} from '@/hooks/useFontFace'

interface RenderedMarp {
  html: string[]
  css: string
  fonts: string[]
}

interface MarpProps {
  border?: boolean
  className?: string
  rendered: RenderedMarp
  page?: number
}

export function Marp({
  border = true,
  className,
  rendered,
  page = 1,
}: MarpProps) {
  const {html, css, fonts} = rendered
  const elementRef = useRef<HTMLSpanElement>(null)

  useFontFace(fonts)

  useEffect(() => {
    const hostEl = elementRef.current
    if (!hostEl) {
      return
    }

    if (!hostEl.shadowRoot) {
      hostEl.attachShadow({mode: 'open'})
    }
    const shadowRoot = hostEl.shadowRoot as ShadowRoot

    const slideHtml = html[page - 1] || ''

    // Shadow DOM 내부에 HTML과 CSS 삽입
    shadowRoot.innerHTML = `
      ${slideHtml}
      <style>${css}</style>
      <style>
        :host { 
          all: initial; 
        }
        :host > [data-marpit-svg] {
          vertical-align: top;
        }
      </style>
    `

    // Mermaid 초기화 및 렌더링
    const initMermaid = async () => {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
      })

      // Shadow DOM 내부의 mermaid 다이어그램 찾기
      const mermaidElements = shadowRoot.querySelectorAll('.mermaid')

      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i] as HTMLElement
        const graphDefinition = element.textContent || ''

        if (graphDefinition.trim()) {
          try {
            const {svg} = await mermaid.render(
              `mermaid-${page}-${i}`,
              graphDefinition,
            )
            element.innerHTML = svg
          } catch (error) {
            element.innerHTML = `<div style="color: red;">Mermaid Error: ${String(error)}</div>`
          }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {browser} = require('@marp-team/marp-core/browser')
    const cleanup = browser(shadowRoot)

    // Mermaid 초기화는 DOM이 준비된 후 실행
    setTimeout(initMermaid, 0)

    return cleanup
  }, [html, css, page])

  return (
    <div className={classNames(border && 'border shadow-lg', className)}>
      {/* Shadow DOM의 호스트가 될 span */}
      <span ref={elementRef} />
    </div>
  )
}
