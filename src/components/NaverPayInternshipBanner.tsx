'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useState, useEffect} from 'react'

import {track} from '@vercel/analytics/react'

const localStorageKey = 'hideBanner_NaverPayIntern_20250609'
const endDate = new Date('2025-06-15T23:59:59')

const NaverPayInternshipBanner = ({
  postPath = '/2025/06/naver-pay-fe-summer-internship',
}: {
  postPath?: string
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const now = new Date()
    const end = new Date(endDate)

    if (now > end) {
      return
    }

    // Hide banner on the internship post page
    if (pathname.startsWith(postPath)) {
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
  }, [postPath, pathname])

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
      className={`fixed inset-0 flex items-center justify-center bg-black/50 z-50 transition-opacity duration-500 ${isMounted ? 'opacity-100' : 'opacity-0'}`}
      role="alert"
    >
      <div
        className={`relative bg-gradient-to-r from-green-600 via-green-500 to-teal-500 text-white p-6 rounded shadow-lg transition-transform duration-500 ${isMounted ? 'scale-100' : 'scale-90'}`}
      >
        <button
          aria-label="배너 닫기 (다시 보지 않음)"
          onClick={handleClose}
          className="absolute top-2 right-2 p-1 text-green-200 hover:text-white"
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

        <div className="text-center px-6">
          <p className="font-bold text-lg mb-2">
            네이버페이 FE 개발 인턴십 모집 중!
          </p>
          <p className="text-sm text-green-100 font-bold mb-4">
            6월 9일부터 15일까지 지원 가능합니다.
          </p>
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
  )
}

export default NaverPayInternshipBanner
