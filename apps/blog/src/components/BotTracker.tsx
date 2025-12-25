'use client'

import {useEffect} from 'react'
import {usePathname} from 'next/navigation'

import {detectBot} from '#src/constants/bot-signatures'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function isLikelyBot(): boolean {
  if (typeof window === 'undefined') return false

  if (navigator.webdriver) return true
  if (navigator.plugins?.length === 0) return true
  if (!navigator.language) return true

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

      const visitorType = isBot ? 'bot' : likelyBot ? 'suspicious' : 'human'

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'visitor_detected', {
          visitor_type: visitorType,
          bot_name: botName,
          bot_category: botCategory,
          is_webdriver: navigator.webdriver ? 'yes' : 'no',
          plugins_count: navigator.plugins?.length ?? 0,
          page_path: pathname,
        })

        if (isBot || likelyBot) {
          window.gtag('event', 'bot_visit', {
            bot_name: botName,
            bot_category: botCategory,
            page_path: pathname,
            user_agent: navigator.userAgent.slice(0, 200),
          })
        }
      }
    })
  }, [pathname])

  return null
}
