'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useRef} from 'react'

// GA4 세션은 마지막 이벤트로부터 30분이 지나면 끝난다. 열어 둔 탭으로 그 뒤에
// 돌아오면 INP, CLS, user_engagement 같은 이벤트가 page_view 없이 새 세션을 열어
// 랜딩 페이지가 (not set)으로 잡힌다. bfcache 복원도 page_view를 보내지 않는다.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

function sendPageView(pathname: string) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: pathname,
      page_location: window.location.href,
    })
  }
}

// 최초 로드의 page_view는 layout.tsx의 gtag('config') 호출이 전송하므로,
// 이 컴포넌트는 클라이언트 사이드 라우팅으로 인한 경로 변경과
// 세션이 끝난 뒤의 재방문만 추적한다.
export function GoogleAnalyticsPageViewTracker() {
  const pathname = usePathname()
  const isInitialLoad = useRef(true)
  const lastActivity = useRef(0)

  useEffect(() => {
    lastActivity.current = Date.now()
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }
    sendPageView(pathname)
  }, [pathname])

  useEffect(() => {
    // 탭을 숨기면 gtag가 user_engagement를 보내므로 그 시각이 세션의 마지막 활동이다
    const touch = () => {
      const now = Date.now()
      if (now - lastActivity.current >= SESSION_TIMEOUT_MS) {
        sendPageView(window.location.pathname)
      }
      lastActivity.current = now
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        touch()
      } else {
        lastActivity.current = Date.now()
      }
    }
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        sendPageView(window.location.pathname)
        lastActivity.current = Date.now()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pointerdown', touch, {passive: true})
    window.addEventListener('keydown', touch, {passive: true})
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('keydown', touch)
    }
  }, [])

  return null
}
