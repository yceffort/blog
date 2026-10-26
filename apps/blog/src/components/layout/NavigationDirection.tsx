'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useLayoutEffect, useRef} from 'react'

const ATTR = 'data-vt-direction'

export default function NavigationDirection() {
  const pathname = usePathname()
  const fromLink = useRef(false)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) {
        return
      }
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('http') || href.startsWith('#')) {
        return
      }
      fromLink.current = true
      // 이전 쪽으로 가는 링크는 data-vt-back을 달아 뒤로 가기와 같은 방향으로 미끄러지게 한다
      document.documentElement.setAttribute(
        ATTR,
        anchor.hasAttribute('data-vt-back') ? 'back' : 'forward',
      )
    }

    const onPopState = () => {
      fromLink.current = false
      document.documentElement.setAttribute(ATTR, 'back')
    }

    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  useLayoutEffect(() => {
    if (fromLink.current && !window.location.hash) {
      window.scrollTo({top: 0, left: 0, behavior: 'instant'})
    }
  }, [pathname])

  useEffect(() => {
    const id = setTimeout(() => {
      document.documentElement.removeAttribute(ATTR)
      fromLink.current = false
    }, 350)
    return () => clearTimeout(id)
  }, [pathname])

  return null
}
