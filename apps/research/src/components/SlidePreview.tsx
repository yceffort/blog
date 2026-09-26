'use client'

import {memo} from 'react'

import * as styles from '@/components/SlideList.styles'
import {useMarpShadowRoot} from '@/hooks/useMarpShadowRoot'

interface SlidePreviewProps {
  html: string
  css: string
  fonts: string[]
}

const HOST_CSS = `
  :host {
    all: initial;
    display: block;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  :host > [data-marpit-svg] {
    vertical-align: top;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
`

export const SlidePreview = memo(function SlidePreviewBase({
  html,
  css,
  fonts,
}: SlidePreviewProps) {
  const hostRef = useMarpShadowRoot(html, css, fonts, HOST_CSS)

  return (
    <div className={styles.preview_frame}>
      <span ref={hostRef} className={styles.preview_host} />
    </div>
  )
})
