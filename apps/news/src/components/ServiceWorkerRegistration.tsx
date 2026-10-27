'use client'

import {useEffect} from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }
    void navigator.serviceWorker.register('/sw.js')
    // 브라우저 탭으로 들른 방문자에게는 미리 받기를 하지 않는다
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && navigator.standalone === true)
    if (standalone) {
      void navigator.serviceWorker.ready.then((registration) =>
        registration.active?.postMessage('save-recent'),
      )
    }
  }, [])
  return null
}
