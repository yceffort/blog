'use client'

import {useEffect, useState} from 'react'

import * as styles from '@/components/FloatingActions.styles'

type PushState = 'unsupported' | 'off' | 'on' | 'busy'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

// 새 호 알림 구독. iOS는 홈 화면에 설치한 앱에서만 PushManager가 있어서 탭에서는 버튼이 숨는다.
export default function PushToggle() {
  const [pushState, setPushState] = useState<PushState>('unsupported')

  useEffect(() => {
    let cancelled = false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return undefined
    }
    // production에서만 SW를 등록하므로 dev에서는 ready가 끝나지 않아 버튼이 숨은 채로 남는다.
    const syncPushState = async () => {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (!cancelled) {
        setPushState(subscription ? 'on' : 'off')
      }
    }
    void syncPushState()
    return () => {
      cancelled = true
    }
  }, [])

  const togglePush = async () => {
    if (pushState === 'unsupported' || pushState === 'busy') {
      return
    }
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration) {
      return
    }
    setPushState('busy')
    try {
      if (pushState === 'on') {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({endpoint: subscription.endpoint}),
          })
          await subscription.unsubscribe()
        }
        setPushState('off')
        return
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setPushState('off')
        return
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
        ),
      })
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(subscription.toJSON()),
      })
      if (!response.ok) {
        await subscription.unsubscribe()
        setPushState('off')
        return
      }
      setPushState('on')
    } catch {
      setPushState('off')
    }
  }

  if (pushState === 'unsupported') {
    return null
  }
  const on = pushState === 'on'
  const label = on ? '새 호 알림 끄기' : '새 호 알림 받기'
  return (
    <button
      type="button"
      className={styles.button}
      onClick={togglePush}
      disabled={pushState === 'busy'}
      aria-pressed={on}
      aria-label={label}
      title={label}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    </button>
  )
}
