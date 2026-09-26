'use client'

import {useEffect} from 'react'

// 같은 덱의 슬라이드가 여러 장 동시에 떠도 @font-face 스타일은 한 벌만 둔다
const mounted = new Map<string, {el: HTMLStyleElement; count: number}>()

export function useFontFace(fonts: string[]) {
  const key = fonts.join('\n')

  useEffect(() => {
    if (!key) {
      return undefined
    }

    let entry = mounted.get(key)
    if (!entry) {
      const el = document.createElement('style')
      el.setAttribute('data-marp-font-face', '')
      el.textContent = key
      document.head.appendChild(el)
      entry = {el, count: 0}
      mounted.set(key, entry)
    }
    entry.count++

    return () => {
      entry.count--
      if (entry.count === 0) {
        entry.el.remove()
        mounted.delete(key)
      }
    }
  }, [key])
}
