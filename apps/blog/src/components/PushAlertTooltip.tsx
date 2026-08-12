'use client'

import {usePathname} from 'next/navigation'
import {useEffect, useRef, useState} from 'react'

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
      className={`absolute top-full right-0 z-40 mt-3 w-max transition-[opacity,translate] duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute -top-1 right-4 h-2.5 w-2.5 rotate-45 bg-gray-900 dark:bg-gray-100"
      />
      <div className="flex items-center gap-2 rounded-xl bg-gray-900 py-2.5 pr-2 pl-4 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
        <button
          type="button"
          className="font-medium"
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
          className="px-1.5 text-base leading-none opacity-60 hover:opacity-100"
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
