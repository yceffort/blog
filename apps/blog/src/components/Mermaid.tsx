'use client'

import {useCallback, useEffect, useRef, useState} from 'react'

import Panzoom from '@panzoom/panzoom'
import mermaid from 'mermaid'
import {useTheme} from 'next-themes'
// @ts-expect-error - react-dom types issue with React 19
import {createPortal} from 'react-dom'

export default function Mermaid({chart}: {chart: string}) {
  const {theme} = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [rendered, setRendered] = useState(false)
  const [svgMarkup, setSvgMarkup] = useState('')
  const [isZoomed, setIsZoomed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const zoomContainerRef = useRef<HTMLDivElement>(null)
  const zoomContentRef = useRef<HTMLDivElement>(null)
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null)

  useEffect(() => {
    let cancelled = false
    setRendered(false)
    setSvgMarkup('')

    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'base' : 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      fontSize: 20,
      flowchart: {useMaxWidth: false},
      sequence: {useMaxWidth: false},
      gantt: {useMaxWidth: false},
      journey: {useMaxWidth: false},
      timeline: {useMaxWidth: false},
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
          const svgElement = ref.current.querySelector('svg')
          if (svgElement) {
            const viewBox = svgElement.getAttribute('viewBox')
            const widthAttr = svgElement.getAttribute('width') || ''
            const heightAttr = svgElement.getAttribute('height') || ''
            const hasPercentWidth = widthAttr.trim().endsWith('%')
            const hasPercentHeight = heightAttr.trim().endsWith('%')
            if (viewBox && (hasPercentWidth || hasPercentHeight)) {
              const [, , viewBoxWidth, viewBoxHeight] = viewBox
                .split(/\s+/)
                .map((value) => Number(value))
              if (Number.isFinite(viewBoxWidth) && viewBoxWidth > 0) {
                svgElement.setAttribute('width', `${viewBoxWidth}`)
                svgElement.style.width = `${viewBoxWidth}px`
              }
              if (Number.isFinite(viewBoxHeight) && viewBoxHeight > 0) {
                svgElement.setAttribute('height', `${viewBoxHeight}`)
                svgElement.style.height = `${viewBoxHeight}px`
              }
            }
            setSvgMarkup(svgElement.outerHTML)
          } else {
            setSvgMarkup(svg)
          }
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

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isZoomed) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAnimating(false)
        setTimeout(() => setIsZoomed(false), 200)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isZoomed])

  useEffect(() => {
    if (!isZoomed || !zoomContainerRef.current || !zoomContentRef.current) {
      return
    }

    const contentElement = zoomContentRef.current
    const panzoomInstance = Panzoom(contentElement, {
      maxScale: 6,
      minScale: 0.5,
      cursor: 'move',
      startScale: 1,
    })
    panzoomRef.current = panzoomInstance

    const parent = zoomContainerRef.current
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      if (!contentElement.isConnected || !parent.isConnected) {
        return
      }
      panzoomInstance.zoomWithWheel(event)
    }

    parent.addEventListener('wheel', handleWheel, {passive: false})

    return () => {
      parent.removeEventListener('wheel', handleWheel)
      panzoomInstance.destroy()
      panzoomRef.current = null
    }
  }, [isZoomed, svgMarkup])

  const handleOpen = useCallback(() => {
    if (!svgMarkup) {
      return
    }
    setIsZoomed(true)
    requestAnimationFrame(() => setIsAnimating(true))
  }, [svgMarkup])

  const handleClose = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => setIsZoomed(false), 200)
  }, [])

  return (
    <>
      <div
        className="my-8 overflow-x-auto mermaid-wrapper cursor-zoom-in"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleOpen()
          }
        }}
      >
        <div
          ref={ref}
          className={`mermaid ${rendered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        />
      </div>

      {mounted &&
        isZoomed &&
        createPortal(
          <div className="fixed inset-0 z-[9999]" onClick={handleClose}>
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-200 ${
                isAnimating ? 'opacity-90' : 'opacity-0'
              }`}
            />
            <div
              className="absolute inset-0 flex items-center justify-center p-4"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                ref={zoomContainerRef}
                className="mermaid-zoom flex h-full w-full items-center justify-center touch-none overflow-hidden"
              >
                <div
                  ref={zoomContentRef}
                  className="mermaid-zoom-content"
                  dangerouslySetInnerHTML={{__html: svgMarkup}}
                  style={{touchAction: 'none'}}
                />
              </div>
            </div>
            <div
              className={`mermaid-zoom-controls absolute bottom-4 right-4 flex gap-2 transition-opacity duration-200 ${
                isAnimating ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button
                className="rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation()
                  panzoomRef.current?.zoomIn()
                }}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                className="rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation()
                  panzoomRef.current?.zoomOut()
                }}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                className="rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20"
                onClick={(event) => {
                  event.stopPropagation()
                  panzoomRef.current?.reset()
                }}
                aria-label="Reset zoom"
              >
                reset
              </button>
            </div>
            <button
              className={`absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition-opacity duration-200 hover:bg-white/20 ${
                isAnimating ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={(event) => {
                event.stopPropagation()
                handleClose()
              }}
              aria-label="Close"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
