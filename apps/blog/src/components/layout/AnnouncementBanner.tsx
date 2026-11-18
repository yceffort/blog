'use client'

import {getCookie, setCookie} from '@yceffort/shared/utils'
import {startTransition, useEffect, useState, ViewTransition} from 'react'

import * as announcementBannerStyles from './AnnouncementBanner.styles'

// 메일 구독 공지. 글 끝 구독 칸(#newsletter)까지 70%쯤 읽은 독자에게 한 번만 띄우고, 누르면 그 칸으로 보낸다.
// 예전 첫 방문 툴팁(8/11 ~ 10/15)은 읽기 전에 떠서 2,486명 중 2명만 눌렀다
const END_AT = new Date('2026-12-31T23:59:59+09:00').getTime()
export const NEWSLETTER_NOTICE_COOKIE = 'newsletter-notice-dismissed'
export const NEWSLETTER_ANCHOR = 'newsletter'

const track = (name: string) => window.gtag?.('event', name)

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const target = document.getElementById(NEWSLETTER_ANCHOR)
    if (!target || Date.now() > END_AT || getCookie(NEWSLETTER_NOTICE_COOKIE)) {
      return undefined
    }
    let shown = false
    const onScroll = () => {
      const formTop = target.getBoundingClientRect().top + window.scrollY
      if (shown || (window.scrollY + window.innerHeight) / formTop < 0.7) {
        return
      }
      shown = true
      track('newsletter_notice_view')
      startTransition(() => setVisible(true))
    }
    // 구독 칸이 화면에 들어오면 공지는 할 일을 다 했다
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        return
      }
      setCookie(NEWSLETTER_NOTICE_COOKIE, '1')
      startTransition(() => setVisible(false))
      stop()
    })
    function stop() {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
    window.addEventListener('scroll', onScroll, {passive: true})
    observer.observe(target)
    return stop
  }, [])

  if (!visible) {
    return null
  }
  const close = (event: string) => {
    setCookie(NEWSLETTER_NOTICE_COOKIE, '1')
    track(event)
    startTransition(() => setVisible(false))
  }
  const go = () => {
    const target = document.getElementById(NEWSLETTER_ANCHOR)
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    target?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    })
    target
      ?.querySelector<HTMLInputElement>('input[type="email"]')
      ?.focus({preventScroll: true})
    close('newsletter_notice_click')
  }
  return (
    <ViewTransition name="announcement-banner">
      <div className={announcementBannerStyles.div}>
        <div className={announcementBannerStyles.div2}>
          <div aria-hidden="true" className={announcementBannerStyles.div3} />
          <div className={announcementBannerStyles.div4}>
            <button
              type="button"
              onClick={go}
              className={`announcement-link ${announcementBannerStyles.link}`}
            >
              <span className={announcementBannerStyles.span}>
                <span className={announcementBannerStyles.span2}>
                  <span className={announcementBannerStyles.span3} />
                  <span className={announcementBannerStyles.span4} />
                </span>
                <span className={announcementBannerStyles.span5}>NEW</span>
                <span className={announcementBannerStyles.span6}>
                  주간 메일
                </span>
              </span>
              <span className={announcementBannerStyles.span7}>
                월요일 아침, 지난주 글을 메일로
                <span className={announcementBannerStyles.span8}>
                  {' '}
                  한 주에 한 번 모아서 보내드립니다
                </span>
              </span>
              <span className={announcementBannerStyles.span9}>
                구독하기
                <span aria-hidden="true">↓</span>
              </span>
            </button>
            <button
              type="button"
              aria-label="공지 닫기"
              onClick={() => close('newsletter_notice_dismiss')}
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
