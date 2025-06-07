'use client'

import Link from 'next/link'
import {useState, useEffect} from 'react'

import {track} from '@vercel/analytics/react'

const NaverPayInternshipBanner = ({
  postPath = '/2025/06/naver-pay-fe-summer-internship',
}: {
  postPath?: string
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const localStorageKey = 'hideBanner_NaverPayIntern_20250609'

  useEffect(() => {
    const now = new Date()
    const start = new Date('2025-06-09T00:00:00')
    const end = new Date('2025-06-15T23:59:59')

    if (now < start || now > end) {
      return
    }

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
    track('clicked.naverpay_internship_banner_close')
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
      className={`fixed top-0 left-0 w-full bg-gradient-to-r from-green-600 via-green-500 to-teal-500 text-white p-4 shadow-lg z-50 transition-all duration-500 ease-out transform ${isMounted ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
      role="alert"
    >
      <button
        aria-label="배너 닫기 (다시 보지 않음)"
        onClick={handleClose}
        className="absolute top-2 right-2 p-1 text-green-200 hover:text-white z-10 sm:top-3 sm:right-3"
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
              네이버페이 FE 개발 인턴십 모집 중!
            </p>
            <p className="text-sm text-green-100 font-bold">
              6월 9일부터 15일까지 지원 가능합니다.
            </p>
          </div>
          <div className="flex-shrink-0 mt-2 sm:mt-0">
            <Link
              href={postPath}
              onClick={() => track('clicked.naverpay_internship_banner')}
              className="bg-white hover:bg-gray-100 text-green-700 text-sm font-bold py-2 px-4 rounded shadow"
            >
              자세히 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NaverPayInternshipBanner
