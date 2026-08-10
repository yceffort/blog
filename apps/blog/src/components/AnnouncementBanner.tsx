'use client'

import {getCookie, setCookie} from '@yceffort/shared/utils'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {startTransition, useEffect, useState, ViewTransition} from 'react'

const POST_PATH = '/2026/08/who-learns-to-judge-interviews'
const END_AT = new Date('2026-08-31T23:59:59+09:00').getTime()
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
      <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-surface px-4 py-3 shadow-lg">
          <p className="text-sm text-ink-2">
            <Link
              href={POST_PATH}
              className="font-semibold text-brand-2 hover:underline"
            >
              AI 시대의 개발 이야기를 들려주실 분을 찾습니다
            </Link>
            <span className="ml-2 whitespace-nowrap text-ink-3">
              8월 31일까지
            </span>
          </p>
          <button
            type="button"
            aria-label="배너 닫기"
            onClick={dismiss}
            className="shrink-0 rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
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
    </ViewTransition>
  )
}
