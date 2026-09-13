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
    let observer: IntersectionObserver | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let attempts = 0

    // gtag는 afterInteractive로 주입되므로 이 effect보다 늦게 준비된다. 준비 전에
    // 관찰을 시작하면 첫 화면에 걸린 블록의 노출이 그대로 버려지고, unobserve까지
    // 끝난 뒤라 다시 잡을 기회도 없다. 화면 위쪽 블록만 과소 집계되므로 gtag를
    // 기다렸다가 관찰을 시작한다. GA가 차단된 환경에서는 결국 포기한다.
    function start() {
      if (typeof window.gtag !== 'function') {
        if (attempts++ < 50) {
          timer = setTimeout(start, 200)
        }
        return
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue
            }
            observer?.unobserve(entry.target)

            window.gtag?.('event', 'internal_nav_view', {
              nav_block: (entry.target as HTMLElement).dataset.nav,
              page_path: pathname,
            })
          }
        },
        {threshold: 0.5},
      )

      document
        .querySelectorAll<HTMLElement>('[data-nav]')
        .forEach((block) => observer?.observe(block))
    }

    start()
    return () => {
      clearTimeout(timer)
      observer?.disconnect()
    }
  }, [pathname])

  return null
}
