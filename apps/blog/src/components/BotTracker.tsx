'use client'

import {usePathname} from 'next/navigation'
import {useEffect} from 'react'

import {track} from '@vercel/analytics'

import {detectBot} from '#src/constants/bot-signatures'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function isLikelyBot(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  if (navigator.webdriver) {
    return true
  }
  if (navigator.plugins?.length === 0) {
    return true
  }
  if (!navigator.language) {
    return true
  }

  return false
}

function scheduleIdleTask(callback: () => void) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(callback, {timeout: 2000})
  } else {
    setTimeout(callback, 1000)
  }
}

export function BotTracker() {
  const pathname = usePathname()

  useEffect(() => {
    scheduleIdleTask(() => {
      const {isBot, botName, botCategory} = detectBot(navigator.userAgent)
      const likelyBot = isLikelyBot()

      if (isBot || likelyBot) {
        track('bot_visit', {
          bot_name: botName,
          bot_category: botCategory,
          page_path: pathname,
        })
      } else {
        track('human_visit', {
          page_path: pathname,
        })
      }

      if (typeof window.gtag === 'function') {
        if (isBot || likelyBot) {
          window.gtag('event', 'bot_visit', {
            bot_name: botName,
            bot_category: botCategory,
            page_path: pathname,
          })
        } else {
          window.gtag('event', 'human_visit', {
            page_path: pathname,
          })
        }
      }
    })
  }, [pathname])

  return null
}
