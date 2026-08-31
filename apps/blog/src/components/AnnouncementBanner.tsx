'use client'

import {getCookie, setCookie} from '@yceffort/shared/utils'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {startTransition, useEffect, useState, ViewTransition} from 'react'

const POST_PATH = '/2026/08/who-learns-to-judge-interviews'
const END_AT = new Date('2026-09-30T23:59:59+09:00').getTime()
const COOKIE_NAME = 'interview-banner-dismissed'

export default function AnnouncementBanner() {
  const pathname = usePathname() ?? '/'
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (Date.now() > END_AT || getCookie(COOKIE_NAME)) {
      return
    }
    startTransition(() => setVisible(true))
  }, [])

  if (!visible || pathname.startsWith('/en') || pathname === POST_PATH) {
    return null
  }

  const dismiss = () => {
    setCookie(COOKIE_NAME, '1')
    startTransition(() => setVisible(false))
  }

  return (
    <ViewTransition name="announcement-banner">
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl bg-gradient-to-r from-brand-1 via-brand-2 to-brand-3 p-[2px] shadow-[0_16px_40px_-16px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-3 rounded-[14px] bg-surface px-4 py-3">
            <Link href={POST_PATH} className="group min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex size-full rounded-full bg-brand-3 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand-3" />
                </span>
                <span className="text-xs font-bold tracking-wide text-brand-3">
                  인터뷰 모집 중
                </span>
                <span className="text-xs text-ink-3">9월 30일 마감</span>
              </span>
              <span className="mt-1 block text-sm font-semibold leading-snug text-ink transition-colors group-hover:text-brand-2">
                AI 시대의 개발 이야기를 들려주실 분을 찾습니다
                <span
                  aria-hidden="true"
                  className="ml-1 inline-block transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="배너 닫기"
              onClick={dismiss}
              className="shrink-0 self-start rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </ViewTransition>
  )
}
