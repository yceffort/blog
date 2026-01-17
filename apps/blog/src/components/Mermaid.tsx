'use client'

import {useEffect, useRef, useState} from 'react'

import mermaid from 'mermaid'
import {useTheme} from 'next-themes'

export default function Mermaid({chart}: {chart: string}) {
  const {theme} = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRendered(false)

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      themeVariables:
        theme === 'dark'
          ? {
              lineColor: '#9ca3af',
              primaryBorderColor: '#6b7280',
              primaryTextColor: '#e5e7eb',
            }
          : undefined,
    })

    const renderChart = async () => {
      if (!ref.current) return

      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
        const {svg} = await mermaid.render(id, chart)
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setRendered(true)
        }
      } catch (error) {
        console.error('Mermaid rendering failed:', error)
        if (!cancelled && ref.current) {
          ref.current.innerText = 'Invalid Mermaid syntax'
          setRendered(true)
        }
      }
    }

    renderChart()

    return () => {
      cancelled = true
    }
  }, [chart, theme])

  return (
    <div
      ref={ref}
      className={`mermaid flex justify-center my-8 ${rendered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
    />
  )
}
