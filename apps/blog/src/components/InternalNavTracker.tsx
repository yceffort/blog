'use client'

import {usePathname} from 'next/navigation'
import {useEffect} from 'react'

// 글 하단 도선(관련 글, 시리즈 내비게이션)이 실제로 노출되는지, 노출되면 눌리는지를
// 나눠서 잡는다. 클릭만 재면 "스크롤이 거기까지 안 간 것"과 "보고도 안 누른 것"이
// 구분되지 않아, 도선을 고쳐야 할지 위치를 옮겨야 할지 판단할 수 없다.
// 대상은 data-nav 속성을 단 블록이다.
export function InternalNavTracker() {
  const pathname = usePathname()

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (typeof window.gtag !== 'function') {
        return
      }

      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null
      const block = anchor?.closest<HTMLElement>('[data-nav]')
      if (!anchor?.href || !block) {
        return
      }

      window.gtag('event', 'internal_nav_click', {
        nav_block: block.dataset.nav,
        link_url: new URL(anchor.href, window.location.href).pathname,
        page_path: window.location.pathname,
      })
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          observer.unobserve(entry.target)

          if (typeof window.gtag === 'function') {
            window.gtag('event', 'internal_nav_view', {
              nav_block: (entry.target as HTMLElement).dataset.nav,
              page_path: pathname,
            })
          }
        }
      },
      {threshold: 0.5},
    )

    document
      .querySelectorAll<HTMLElement>('[data-nav]')
      .forEach((block) => observer.observe(block))
    return () => observer.disconnect()
  }, [pathname])

  return null
}
