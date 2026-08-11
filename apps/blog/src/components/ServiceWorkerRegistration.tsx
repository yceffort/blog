'use client'

import {useEffect, useRef, useState} from 'react'

const EXIT_DURATION = 300

export function ServiceWorkerRegistration() {
  const [savedPath, setSavedPath] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const clearTimers = () => {
      for (const timer of timers.current) {
        clearTimeout(timer)
      }
      timers.current = []
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'page-saved') {
        return
      }
      clearTimers()
      setSavedPath(event.data.url as string)
      setVisible(false)
      timers.current = [
        // 마운트 직후 한 프레임 뒤에 표시해야 등장 트랜지션이 걸린다
        setTimeout(() => setVisible(true), 30),
        setTimeout(() => {
          setVisible(false)
          timers.current.push(
            setTimeout(() => setSavedPath(null), EXIT_DURATION),
          )
        }, 2500),
      ]
    }

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
      navigator.serviceWorker.addEventListener('message', onMessage)
      // addEventListener만으로는 SW가 보낸 메시지가 디스패치되지 않는다
      navigator.serviceWorker.startMessages()
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onMessage)
      }
      clearTimers()
    }
  }, [])

  if (!savedPath) {
    return null
  }

  return (
    <output
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-lg transition-[opacity,translate] duration-300 dark:bg-gray-100 dark:text-gray-900 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      {savedPath.startsWith('/en')
        ? '✓ Saved for offline'
        : '✓ 오프라인에 저장됨'}
    </output>
  )
}
