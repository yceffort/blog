'use client'

import * as stylex from '@stylexjs/stylex'
import {useEffect, useRef, useState, useSyncExternalStore} from 'react'
const spinAnimation = stylex.keyframes({
  to: {
    transform: 'rotate(360deg)',
  },
})
const sx = stylex.create({
  div: {
    '@layer utilities': {
      pointerEvents: 'none',
      position: 'fixed',
      insetInline: '0px',
      top: '0px',
      zIndex: '50',
      display: 'flex',
      justifyContent: 'center',
    },
  },
  div2: {
    '@layer utilities': {
      marginTop: '-48px',
      display: 'flex',
      height: 'calc(var(--spacing) * 10)',
      width: 'calc(var(--spacing) * 10)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'calc(infinity * 1px)',
      backgroundColor: {
        default: 'var(--color-white)',
        ':is(.dark *)': 'oklch(27.4% 0.006 286.033)',
      },
      opacity: '0%',
      '--blog-shadow':
        '0 4px 6px -1px var(--blog-shadow-color, rgb(0 0 0 / 0.1)), 0 2px 4px -2px var(--blog-shadow-color, rgb(0 0 0 / 0.1))',
      boxShadow:
        'var(--blog-inset-shadow), var(--blog-inset-ring-shadow), var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
    },
  },
  svg: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 5)',
      width: 'calc(var(--spacing) * 5)',
      animationName: spinAnimation,
      animationDuration: '1s',
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
    },
  },
  circle: {
    '@layer utilities': {
      opacity: '25%',
    },
  },
  path: {
    '@layer utilities': {
      opacity: '75%',
    },
  },
  svg2: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 5)',
      width: 'calc(var(--spacing) * 5)',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
    },
  },
})
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
    (
      navigator as {
        standalone?: boolean
      }
    ).standalone === true
  return isIOS && isStandalone
}

// 판정 결과는 세션 동안 바뀌지 않으므로 구독은 아무것도 하지 않는다
const subscribe = () => () => {}
export default function PullToRefresh() {
  // 서버에서는 항상 false, 하이드레이션 이후 클라이언트 판정으로 바뀐다
  const enabled = useSyncExternalStore(subscribe, isIOSStandalone, () => false)
  const [refreshing, setRefreshing] = useState(false)
  const circleRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<SVGSVGElement>(null)
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
    document.addEventListener('touchstart', onTouchStart, {
      passive: true,
    })
    document.addEventListener('touchmove', onTouchMove, {
      passive: false,
    })
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
    <div className={stylex.props(sx.div).className}>
      <div ref={circleRef} className={stylex.props(sx.div2).className}>
        {refreshing ? (
          <svg
            className={stylex.props(sx.svg).className}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className={stylex.props(sx.circle).className}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className={stylex.props(sx.path).className}
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          <svg
            ref={arrowRef}
            className={stylex.props(sx.svg2).className}
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
