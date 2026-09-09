'use client'

import {getCookie, setCookie} from '@yceffort/shared/utils'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {startTransition, useEffect, useState, ViewTransition} from 'react'

const POST_PATH = '/2026/09/who-learns-to-judge-beta-reader'
const END_AT = new Date('2026-09-30T23:59:59+09:00').getTime()
const COOKIE_NAME = 'beta-reader-banner-dismissed'

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
        <div className="pointer-events-auto relative w-full max-w-xl overflow-hidden rounded-2xl bg-ink text-surface shadow-[0_24px_48px_-16px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3 opacity-40 blur-3xl"
          />
          <div className="relative flex items-center gap-4 px-5 py-4">
            <Link href={POST_PATH} className="group min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="relative flex size-2 shrink-0">
                  <span className="absolute inline-flex size-full rounded-full bg-brand-3 opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-brand-3" />
                </span>
                <span className="text-xs font-bold tracking-wider text-brand-2 uppercase">
                  베타리더 / 인터뷰이 모집
                </span>
                <span className="text-xs text-surface/60">9월 30일까지</span>
              </span>
              <span className="mt-1.5 block text-[15px] leading-snug font-semibold">
                『남은 판단은 누가 배우는가』
                <span className="font-normal text-surface/80">
                  {' '}
                  초고를 읽어주실 분과 이야기를 들려주실 분을 찾습니다
                </span>
              </span>
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-1 via-brand-2 to-brand-3 px-3 py-1 text-xs font-bold text-white transition-transform group-hover:translate-x-0.5">
                자세히 보기
                <span aria-hidden="true">→</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="배너 닫기"
              onClick={dismiss}
              className="shrink-0 self-start rounded-md p-1 text-surface/50 transition-colors hover:bg-surface/10 hover:text-surface"
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
