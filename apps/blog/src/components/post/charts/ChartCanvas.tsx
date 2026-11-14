'use client'

import * as stylex from '@stylexjs/stylex'
import {useEffect, useRef} from 'react'

import {sx} from './Chart.styles'
import {mountChart} from './chartClient'
import type {RenderInput} from './chartEngine'

export default function ChartCanvas({
  view,
  dark,
  locale,
  label,
}: RenderInput & {label: string}) {
  const host = useRef<HTMLDivElement>(null)
  const renderer = useRef<ReturnType<typeof mountChart> | null>(null)

  useEffect(() => {
    if (!host.current) return undefined
    const mounted = mountChart(host.current)
    renderer.current = mounted
    return () => {
      renderer.current = null
      mounted.dispose()
    }
  }, [])

  useEffect(() => {
    renderer.current?.update({view, dark, locale}, label)
  }, [view, dark, locale, label])

  return <div ref={host} {...stylex.props(sx.canvasHost)} />
}
