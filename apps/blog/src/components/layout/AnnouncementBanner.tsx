'use client'

import {getCookie, setCookie} from '@yceffort/shared/utils'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {startTransition, useEffect, useState, ViewTransition} from 'react'

import * as announcementBannerStyles from './AnnouncementBanner.styles'
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
      <div className={announcementBannerStyles.div}>
        <div className={announcementBannerStyles.div2}>
          <div aria-hidden="true" className={announcementBannerStyles.div3} />
          <div className={announcementBannerStyles.div4}>
            <Link
              href={POST_PATH}
              className={`announcement-link ${announcementBannerStyles.link}`}
            >
              <span className={announcementBannerStyles.span}>
                <span className={announcementBannerStyles.span2}>
                  <span className={announcementBannerStyles.span3} />
                  <span className={announcementBannerStyles.span4} />
                </span>
                <span className={announcementBannerStyles.span5}>
                  베타리더 / 인터뷰이 모집
                </span>
                <span className={announcementBannerStyles.span6}>
                  9월 30일까지
                </span>
              </span>
              <span className={announcementBannerStyles.span7}>
                『남은 판단은 누가 배우는가』
                <span className={announcementBannerStyles.span8}>
                  {' '}
                  초고를 읽어주실 분과 이야기를 들려주실 분을 찾습니다
                </span>
              </span>
              <span className={announcementBannerStyles.span9}>
                자세히 보기
                <span aria-hidden="true">→</span>
              </span>
            </Link>
            <button
              type="button"
              aria-label="배너 닫기"
              onClick={dismiss}
              className={announcementBannerStyles.button}
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
