'use client'

import {useEffect} from 'react'

// GA4 향상된 측정의 이탈 클릭과 동일한 스키마(click + link_url/link_domain/outbound)로
// 전송해, 표준 linkUrl·linkDomain 측정기준에서 그대로 조회된다. mailto도 포함한다.
export function OutboundLinkTracker() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (typeof window.gtag !== 'function') {
        return
      }

      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null
      if (!anchor?.href) {
        return
      }

      const url = new URL(anchor.href, window.location.href)
      const isMailto = url.protocol === 'mailto:'
      const isExternal =
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.hostname !== window.location.hostname

      if (!isMailto && !isExternal) {
        return
      }

      window.gtag('event', 'click', {
        link_url: anchor.href,
        link_domain: isMailto ? 'mailto' : url.hostname,
        outbound: true,
      })
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}
