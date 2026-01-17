'use client'

import Link from 'next/link'
import {useState, useEffect, useCallback, useRef} from 'react'

import {track} from '@vercel/analytics/react'

const LOCAL_STORAGE_KEY = 'hideBanner_BetaReader_20251113'

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
  postPath = '/2025/11/web-performance-deep-dive-beta-reader',
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
      className={`fixed bottom-0 left-0 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 shadow-lg z-50 transition-all duration-500 ease-out transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      role="alert"
    >
      <button
        aria-label="배너 닫기 (다시 보지 않음)"
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 text-purple-200 hover:text-white z-10 sm:top-7 sm:right-3"
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

      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between pr-8 sm:pr-10">
          <div className="flex-grow mb-3 sm:mb-0 sm:mr-4 text-center sm:text-left">
            <p className="font-bold text-lg mb-1">
              📚 Web Performance Deep Dive 베타 리더 모집 (~11/30)
            </p>
            <p className="text-sm text-purple-100 font-bold">
              웹 성능 최적화의 모든 것을 다룬 신간의 베타 리더를 모집합니다.
              출판 시 책 2권 증정!
            </p>
          </div>
          <div className="flex-shrink-0 mt-2 sm:mt-0">
            <Link
              href={postPath}
              onClick={() => track('clicked.beta_reader_banner')}
              className="bg-white hover:bg-gray-100 text-indigo-700 text-sm font-bold py-2 px-4 rounded shadow"
            >
              자세히 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FloatingBanner
