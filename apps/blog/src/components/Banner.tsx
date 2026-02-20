'use client'

import Link from 'next/link'
import {useState, useEffect, useCallback, useRef} from 'react'

import {track} from '@vercel/analytics/react'

const LOCAL_STORAGE_KEY = 'hideBanner_BetaReader_20260219'

function getHideBannerPreference(): boolean {
  if (typeof window === 'undefined') {
    return true
  }
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const FloatingBanner = ({
  postPath = '/2026/02/nodejs-deep-dive-beta-reader',
}: {
  postPath?: string
}) => {
  const [isHidden, setIsHidden] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const shouldHide = getHideBannerPreference()
    if (shouldHide) {
      return
    }

    const showTimer = setTimeout(() => {
      setIsHidden(false)
    }, 0)
    const mountTimer = setTimeout(() => setIsMounted(true), 100)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(mountTimer)
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    track('clicked.beta_reader_banner_close')
    setIsMounted(false)
    closeTimeoutRef.current = setTimeout(() => {
      setIsHidden(true)
      closeTimeoutRef.current = null
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, 'true')
      } catch {
        // ignore localStorage errors
      }
    }, 500)
  }, [])

  if (isHidden) {
    return null
  }

  return (
    <div
      className={`fixed bottom-0 left-0 w-full bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 text-gray-900 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 dark:text-white p-4 shadow-lg z-50 transition-all duration-500 ease-out transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      role="alert"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-5xl xl:px-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex-grow min-w-0 text-left">
            <p className="font-bold text-sm sm:text-lg">
              📚 <span className="hidden sm:inline">Node.js Deep Dive </span>베타
              리더 모집 (~2/28)
            </p>
            <p className="hidden sm:block text-sm text-purple-700 dark:text-purple-100 font-bold">
              Node.js의 내부를 깊이 파헤치는 신간의 베타 리더를 모집합니다.
            </p>
          </div>
          <Link
            href={postPath}
            onClick={() => track('clicked.beta_reader_banner')}
            className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-indigo-700 text-sm font-bold py-2 px-4 rounded shadow whitespace-nowrap"
          >
            자세히 보기
          </Link>
          <button
            aria-label="배너 닫기 (다시 보지 않음)"
            onClick={handleClose}
            className="flex-shrink-0 p-1 text-purple-400 hover:text-purple-700 dark:text-purple-200 dark:hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default FloatingBanner
