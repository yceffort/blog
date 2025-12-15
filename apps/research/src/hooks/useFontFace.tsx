'use client'

import {useEffect} from 'react'

export function useFontFace(fonts: string[]) {
  useEffect(() => {
    if (!fonts || fonts.length === 0) {
      return
    }

    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-marp-font-face', '')

    styleEl.innerHTML = fonts.join('\n')
    document.head.appendChild(styleEl)

    return () => {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl)
      }
    }
  }, [fonts])
}
