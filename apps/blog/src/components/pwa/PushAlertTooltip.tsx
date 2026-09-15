'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useRef, useState} from 'react'

import * as pushAlertTooltipStyles from './PushAlertTooltip.styles'
const SEEN_KEY = 'push-alert-tooltip-seen'
const EXIT_DURATION = 300
function trackTooltip(action: 'shown' | 'click' | 'dismiss') {
  if (typeof window.gtag === 'function') {
    window.gtag('event', `push_tooltip_${action}`)
  }
}

// 알림 구독 기능이 Tweaks 패널 안에 숨어 있어서, 미구독 방문자에게
// 한 번만 툴팁으로 알려준다
export default function PushAlertTooltip({onOpen}: {onOpen: () => void}) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const isEn = usePathname()?.startsWith('/en')
  const dismiss = () => {
    setVisible(false)
    timers.current.push(setTimeout(() => setMounted(false), EXIT_DURATION))
  }
  useEffect(() => {
    let cancelled = false
    const activeTimers = timers.current
    const show = async () => {
      if (
        localStorage.getItem(SEEN_KEY) ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        Notification.permission === 'denied'
      ) {
        return
      }
      // production에서만 SW가 등록되므로 dev에서는 ready가 완료되지 않아 표시되지 않는다
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription || cancelled) {
        return
      }
      localStorage.setItem(SEEN_KEY, '1')
      timers.current.push(
        setTimeout(() => {
          setMounted(true)
          trackTooltip('shown')
          timers.current.push(setTimeout(() => setVisible(true), 30))
        }, 1200),
        setTimeout(() => setVisible(false), 9000),
        setTimeout(() => setMounted(false), 9000 + EXIT_DURATION),
      )
    }
    void show()
    return () => {
      cancelled = true
      for (const timer of activeTimers) {
        clearTimeout(timer)
      }
    }
  }, [])
  if (!mounted) {
    return null
  }
  return (
    <div
      className={`${pushAlertTooltipStyles.div3} ${visible ? pushAlertTooltipStyles.div : pushAlertTooltipStyles.div2}`}
    >
      <div aria-hidden="true" className={pushAlertTooltipStyles.div4} />
      <div className={pushAlertTooltipStyles.div5}>
        <button
          type="button"
          className={pushAlertTooltipStyles.button}
          onClick={() => {
            trackTooltip('click')
            dismiss()
            onOpen()
          }}
        >
          {isEn
            ? '🔔 New: get notified of new posts'
            : '🔔 새 글 알림 받기가 생겼어요'}
        </button>
        <button
          type="button"
          aria-label={isEn ? 'Close' : '닫기'}
          className={pushAlertTooltipStyles.button2}
          onClick={() => {
            trackTooltip('dismiss')
            dismiss()
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
