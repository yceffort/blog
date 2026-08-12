'use client'

import {useEffect} from 'react'
import {onCLS, onFCP, onINP, onLCP, onTTFB} from 'web-vitals/attribution'
import type {MetricWithAttribution} from 'web-vitals/attribution'

import {SiteConfig} from '@/config'

const GA_MEASUREMENT_ID = SiteConfig.googleAnalyticsId

// GA4 이벤트 파라미터 값은 100자 제한이 있다
function truncate(value: string | undefined) {
  return value?.slice(0, 100)
}

function sendToGoogleAnalytics(metric: MetricWithAttribution) {
  if (typeof window.gtag !== 'function' || !GA_MEASUREMENT_ID) {
    // eslint-disable-next-line no-console
    console.warn(
      'Google Analytics gtag function not found or GA_MEASUREMENT_ID is missing.',
    )
    return
  }

  const {name, value, id, navigationType} = metric

  const params: Record<string, string | number | boolean | undefined> = {
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    event_category: 'Web Vitals',
    event_label: id,
    non_interaction: true,
    navigation_type: navigationType,
    sw_controlled: navigator.serviceWorker?.controller ? 'yes' : 'no',
  }

  if (name === 'LCP') {
    const {attribution} = metric
    params.lcp_target = truncate(attribution.target)
    params.lcp_url = truncate(attribution.url)
    params.lcp_ttfb = Math.round(attribution.timeToFirstByte)
    params.lcp_resource_load_delay = Math.round(attribution.resourceLoadDelay)
    params.lcp_resource_load_duration = Math.round(
      attribution.resourceLoadDuration,
    )
    params.lcp_element_render_delay = Math.round(attribution.elementRenderDelay)
  }

  window.gtag('event', name, params)
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
