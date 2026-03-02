'use client'

import {usePathname} from 'next/navigation'
import {useEffect} from 'react'

const ATTR = 'data-vt-direction'

export default function NavigationDirection() {
  const pathname = usePathname()

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
      document.documentElement.setAttribute(ATTR, 'forward')
    }

    const onPopState = () => {
      document.documentElement.setAttribute(ATTR, 'back')
    }

    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPopState)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      document.documentElement.removeAttribute(ATTR)
    }, 350)
    return () => clearTimeout(id)
  }, [pathname])

  return null
}
