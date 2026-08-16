'use client'

import {useEffect, useRef, useState} from 'react'

const THRESHOLD = 70
const MAX_PULL = 110
// 당긴 거리를 감쇠해서 인디케이터가 손가락보다 천천히 따라오게 한다
const RESISTANCE = 0.4

// iOS standalone PWA에서만 활성화한다. 일반 브라우저와 Android PWA에는
// 브라우저 내장 pull-to-refresh가 있다. iPadOS는 데스크톱 UA를 쓰므로
// 터치 지원 여부로 구분한다.
function isIOSStandalone() {
  const isIOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as {standalone?: boolean}).standalone === true
  return isIOS && isStandalone
}

export default function PullToRefresh() {
  const [enabled, setEnabled] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const circleRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    setEnabled(isIOSStandalone())
  }, [])

  useEffect(() => {
    const circle = circleRef.current
    const arrow = arrowRef.current
    if (!enabled || !circle || !arrow) {
      return undefined
    }

    let startY = 0
    let pull = 0
    let pulling = false
    let done = false

    const render = (animate: boolean) => {
      circle.style.transition = animate
        ? 'transform 0.2s ease-out, opacity 0.2s ease-out'
        : 'none'
      circle.style.transform = `translateY(${pull}px)`
      circle.style.opacity = `${Math.min(pull / THRESHOLD, 1)}`
      arrow.style.transform = pull >= THRESHOLD ? 'rotate(180deg)' : ''
    }

    const onTouchStart = (event: TouchEvent) => {
      if (done || window.scrollY > 0 || event.touches.length !== 1) {
        return
      }
      startY = event.touches[0].clientY
      pulling = true
      pull = 0
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!pulling || done) {
        return
      }
      const dy = event.touches[0].clientY - startY
      if (dy <= 0 || window.scrollY > 0) {
        pull = 0
        render(false)
        return
      }
      // 러버밴딩 스크롤 대신 커스텀 인디케이터를 움직인다
      event.preventDefault()
      pull = Math.min(dy * RESISTANCE, MAX_PULL)
      render(false)
    }

    const onTouchEnd = () => {
      if (!pulling || done) {
        return
      }
      pulling = false
      if (pull >= THRESHOLD) {
        done = true
        pull = THRESHOLD
        render(true)
        setRefreshing(true)
        window.location.reload()
      } else {
        pull = 0
        render(true)
      }
    }

    document.addEventListener('touchstart', onTouchStart, {passive: true})
    document.addEventListener('touchmove', onTouchMove, {passive: false})
    document.addEventListener('touchend', onTouchEnd)
    document.addEventListener('touchcancel', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled])

  if (!enabled) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div
        ref={circleRef}
        className="mt-[-48px] flex h-10 w-10 items-center justify-center rounded-full bg-white opacity-0 shadow-md dark:bg-gray-800"
      >
        {refreshing ? (
          <svg
            className="h-5 w-5 animate-spin text-gray-500 dark:text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          <svg
            ref={arrowRef}
            className="h-5 w-5 text-gray-500 transition-transform dark:text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </div>
  )
}
