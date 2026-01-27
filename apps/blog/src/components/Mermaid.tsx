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
      theme: theme === 'dark' ? 'base' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      fontSize: 20,
      themeVariables:
        theme === 'dark'
          ? {
              darkMode: true,
              background: '#111827',
              primaryColor: '#1f2937',
              primaryBorderColor: '#60a5fa',
              primaryTextColor: '#f3f4f6',
              secondaryColor: '#374151',
              secondaryBorderColor: '#60a5fa',
              secondaryTextColor: '#f3f4f6',
              tertiaryColor: '#1f2937',
              tertiaryBorderColor: '#60a5fa',
              tertiaryTextColor: '#f3f4f6',
              lineColor: '#60a5fa',
              textColor: '#f3f4f6',
              mainBkg: '#1f2937',
              secondBkg: '#374151',
              mainContrastColor: '#f3f4f6',
              darkMode: true,
              nodeBorder: '#60a5fa',
              clusterBkg: '#111827',
              clusterBorder: '#60a5fa',
              edgeLabelBackground: '#111827',
              defaultLinkColor: '#60a5fa',
              fontSize: 20,
            }
          : {
              fontSize: 20,
            },
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
      className="my-8 overflow-x-auto mermaid-wrapper"
      style={{
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorX: 'contain'
      }}
    >
      <div
        ref={ref}
        className={`mermaid ${rendered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      />
    </div>
  )
}
