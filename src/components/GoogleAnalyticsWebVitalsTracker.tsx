'use client'

import {useEffect} from 'react'

import {onCLS, onFCP, onINP, onLCP, onTTFB} from 'web-vitals'

import type {Metric} from 'web-vitals'

import {SiteConfig} from '#src/config'

const GA_MEASUREMENT_ID = SiteConfig.googleAnalyticsId

function sendToGoogleAnalytics({name, value, id}: Metric) {
  if (typeof window.gtag !== 'function' || !GA_MEASUREMENT_ID) {
    // eslint-disable-next-line no-console
    console.warn(
      'Google Analytics gtag function not found or GA_MEASUREMENT_ID is missing.',
    )
    return
  }

  window.gtag('event', name, {
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    event_category: 'Web Vitals',
    event_label: id,
    non_interaction: true,
  })
}

export function GoogleAnalyticsWebVitalsTracker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && GA_MEASUREMENT_ID) {
      onCLS(sendToGoogleAnalytics)
      onLCP(sendToGoogleAnalytics)

      onINP(sendToGoogleAnalytics)

      onFCP(sendToGoogleAnalytics)
      onTTFB(sendToGoogleAnalytics)
    }
  }, [])

  return null
}
