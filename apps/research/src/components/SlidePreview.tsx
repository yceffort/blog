'use client'

import {useEffect, useRef} from 'react'

import {useFontFace} from '@/hooks/useFontFace'

interface SlidePreviewProps {
  html: string
  css: string
  fonts: string[]
}

export function SlidePreview({html, css, fonts}: SlidePreviewProps) {
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

    shadowRoot.innerHTML = `
      ${html}
      <style>${css}</style>
      <style>
        :host {
          all: initial;
          display: block;
          width: 100%;
          height: 100%;
        }
        :host > [data-marpit-svg] {
          vertical-align: top;
          width: 100%;
          height: 100%;
        }
      </style>
    `

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {browser} = require('@marp-team/marp-core/browser')
    const cleanup = browser(shadowRoot)

    return cleanup
  }, [html, css])

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-t-lg bg-white dark:bg-gray-900">
      <span ref={elementRef} className="block h-full w-full" />
    </div>
  )
}
