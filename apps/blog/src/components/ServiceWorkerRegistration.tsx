'use client'

import {useEffect, useState} from 'react'

export function ServiceWorkerRegistration() {
  const [savedPath, setSavedPath] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'page-saved') {
        setSavedPath(event.data.url as string)
        clearTimeout(timer)
        timer = setTimeout(() => setSavedPath(null), 2500)
      }
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
      clearTimeout(timer)
    }
  }, [])

  if (!savedPath) {
    return null
  }

  return (
    <output className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
      {savedPath.startsWith('/en')
        ? '✓ Saved for offline'
        : '✓ 오프라인에 저장됨'}
    </output>
  )
}
