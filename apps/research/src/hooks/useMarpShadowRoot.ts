'use client'

import {useEffect, useRef} from 'react'

import {useFontFace} from './useFontFace'

// Marp 슬라이드를 Shadow DOM에 격리해 렌더한다.
// hostCss와 afterRender는 effect 의존성이므로 호출부에서 모듈 상수로 넘길 것
export function useMarpShadowRoot(
  html: string,
  css: string,
  fonts: string[],
  hostCss: string,
  afterRender?: (shadowRoot: ShadowRoot) => () => void,
) {
  const hostRef = useRef<HTMLSpanElement>(null)

  useFontFace(fonts)

  useEffect(() => {
    const hostEl = hostRef.current
    if (!hostEl) {
      return undefined
    }
    const shadowRoot = hostEl.shadowRoot ?? hostEl.attachShadow({mode: 'open'})
    shadowRoot.innerHTML = `${html}<style>${css}</style><style>${hostCss}</style>`

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {browser} = require('@marp-team/marp-core/browser')
    const cleanupBrowser = browser(shadowRoot)
    const cleanupAfterRender = afterRender?.(shadowRoot)
    return () => {
      cleanupAfterRender?.()
      cleanupBrowser()
    }
  }, [html, css, hostCss, afterRender])

  return hostRef
}
