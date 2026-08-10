'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useRef} from 'react'

// 최초 로드의 page_view는 layout.tsx의 gtag('config') 호출이 전송하므로,
// 이 컴포넌트는 클라이언트 사이드 라우팅으로 인한 경로 변경만 추적한다.
export function GoogleAnalyticsPageViewTracker() {
  const pathname = usePathname()
  const isInitialLoad = useRef(true)

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pathname,
        page_location: window.location.href,
      })
    }
  }, [pathname])

  return null
}
