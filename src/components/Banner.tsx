'use client'

import {useState, useEffect} from 'react'

interface FloatingBannerProps {
  postPath?: string
}

const FloatingBanner = ({
  postPath = '/2025/04/web-performance-help',
}: FloatingBannerProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const localStorageKey = 'hideBanner_WebPerfHelp_20250426'

  useEffect(() => {
    let hideBannerPreference = 'false'
    try {
      hideBannerPreference = localStorage.getItem(localStorageKey) || 'false'
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('localStorage에 접근할 수 없습니다.', error)
    }
    if (hideBannerPreference !== 'true') {
      setIsVisible(true)
      const timer = setTimeout(() => setIsMounted(true), 100)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    setIsMounted(false)
    setTimeout(() => {
      setIsVisible(false)
      try {
        localStorage.setItem(localStorageKey, 'true')
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('localStorage 저장 실패', error)
      }
    }, 500)
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed bottom-0 left-0 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-4 shadow-lg z-50 transition-all duration-500 ease-out transform ${isMounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
      role="alert"
    >
      <div className="container mx-auto relative">
        <button
          aria-label="배너 닫기 (다시 보지 않음)"
          onClick={handleClose}
          className="absolute top-3 right-2 p-1 text-purple-200 hover:text-white z-[51]"
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

        <div className="flex flex-col sm:flex-row items-center sm:justify-between pr-10">
          <div className="flex-grow mb-3 sm:mb-0 sm:mr-4 text-center sm:text-left">
            <p className="font-bold text-lg mb-1">
              웹사이트 성능 개선, 함께해요!
            </p>
            <p className="text-sm text-purple-100">
              책 집필을 위한 실제 서비스 사례를 찾습니다. 성능 분석 및 개선
              제안을 드려요.
            </p>
          </div>
          <div className="flex-shrink-0 mt-2 sm:mt-0">
            <a
              href={postPath}
              className="bg-white hover:bg-gray-100 text-indigo-700 text-sm font-bold py-2 px-4 rounded shadow"
            >
              자세히 보기
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FloatingBanner
