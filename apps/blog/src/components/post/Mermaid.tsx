'use client'

import type Panzoom from '@panzoom/panzoom'
import {useTheme} from 'next-themes'
import {useCallback, useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'

import * as mermaidStyles from './Mermaid.styles'
function readTokenColor(
  style: CSSStyleDeclaration,
  name: string,
  fallback: string,
) {
  const value = style.getPropertyValue(name).trim()
  return value || fallback
}
function buildThemeVariables(isDark: boolean) {
  if (typeof document === 'undefined') {
    return {
      fontSize: 20,
    }
  }
  const s = getComputedStyle(document.documentElement)
  const primary = readTokenColor(s, '--primary', isDark ? '#818cf8' : '#6366f1')
  const primary2 = readTokenColor(
    s,
    '--primary-2',
    isDark ? '#a78bfa' : '#a78bfa',
  )
  const primary3 = readTokenColor(
    s,
    '--primary-3',
    isDark ? '#f472b6' : '#ec4899',
  )
  const surface = readTokenColor(s, '--surface', isDark ? '#16161f' : '#ffffff')
  const surface2 = readTokenColor(
    s,
    '--surface-2',
    isDark ? '#1c1c28' : '#f5f5f8',
  )
  const bg = readTokenColor(s, '--bg', isDark ? '#0a0a0f' : '#fafafa')
  const ink = readTokenColor(s, '--ink', isDark ? '#f5f5fa' : '#0a0a0f')
  const ink2 = readTokenColor(s, '--ink-2', isDark ? '#c9c9d6' : '#2a2a35')
  const border = readTokenColor(s, '--border-2', isDark ? '#33334d' : '#d4d4dc')
  return {
    darkMode: isDark,
    background: bg,
    primaryColor: surface,
    primaryBorderColor: primary,
    primaryTextColor: ink,
    secondaryColor: surface2,
    secondaryBorderColor: primary2,
    secondaryTextColor: ink,
    tertiaryColor: surface,
    tertiaryBorderColor: primary3,
    tertiaryTextColor: ink,
    lineColor: primary,
    textColor: ink2,
    mainBkg: surface,
    secondBkg: surface2,
    mainContrastColor: ink,
    nodeBorder: primary,
    clusterBkg: bg,
    clusterBorder: border,
    edgeLabelBackground: bg,
    defaultLinkColor: primary,
    fontSize: 20,
  }
}
export default function Mermaid({chart}: {chart: string}) {
  const {resolvedTheme} = useTheme()
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
    const isDark = resolvedTheme === 'dark'
    const run = async () => {
      const {default: mermaid} = await import('mermaid')
      if (cancelled) {
        return
      }
      mermaid.initialize({
        startOnLoad: false,
        layout: 'dagre',
        look: 'classic',
        theme: isDark ? 'dark' : 'base',
        securityLevel: 'loose',
        fontFamily: 'inherit',
        fontSize: 20,
        flowchart: {
          useMaxWidth: false,
        },
        sequence: {
          useMaxWidth: false,
        },
        gantt: {
          useMaxWidth: false,
        },
        journey: {
          useMaxWidth: false,
        },
        timeline: {
          useMaxWidth: false,
        },
        themeVariables: buildThemeVariables(isDark),
      })
      if (!ref.current) {
        return
      }
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`
        const processed = chart.replace(/\\n/g, '<br/>')
        const {svg} = await mermaid.render(id, processed)
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          const svgElement = ref.current.querySelector('svg')
          if (svgElement) {
            svgElement.classList.add(...mermaidStyles.diagramSvg.split(' '))
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
            // 확대 오버레이 안에 들어가는 사본만 max-height 해제가 필요하다
            const zoomSvg = svgElement.cloneNode(true) as SVGSVGElement
            zoomSvg.classList.add(...mermaidStyles.diagramZoomSvg.split(' '))
            setSvgMarkup(zoomSvg.outerHTML)
          } else {
            setSvgMarkup(svg)
          }
          setRendered(true)
        }
      } catch {
        if (!cancelled && ref.current) {
          ref.current.innerText = 'Invalid Mermaid syntax'
          setRendered(true)
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [chart, resolvedTheme])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])
  useEffect(() => {
    if (!isZoomed) {
      return undefined
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
      return undefined
    }
    const contentElement = zoomContentRef.current
    const parent = zoomContainerRef.current
    let cancelled = false
    let cleanup: (() => void) | undefined
    // Panzoom은 확대할 때만 필요하므로 오버레이를 열 때 불러온다.
    const load = async () => {
      const {default: createPanzoom} = await import('@panzoom/panzoom')
      if (cancelled) {
        return
      }
      const panzoomInstance = createPanzoom(contentElement, {
        maxScale: 6,
        minScale: 0.5,
        cursor: 'move',
        startScale: 1,
      })
      panzoomRef.current = panzoomInstance
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault()
        if (!contentElement.isConnected || !parent.isConnected) {
          return
        }
        panzoomInstance.zoomWithWheel(event)
      }
      parent.addEventListener('wheel', handleWheel, {
        passive: false,
      })
      cleanup = () => {
        parent.removeEventListener('wheel', handleWheel)
        panzoomInstance.destroy()
        panzoomRef.current = null
      }
    }
    void load()
    return () => {
      cancelled = true
      cleanup?.()
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
      <button
        type="button"
        className={`mermaid-wrapper ${mermaidStyles.button}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}
        onClick={handleOpen}
        aria-label="다이어그램 확대"
      >
        <div
          ref={ref}
          className={`mermaid ${rendered ? mermaidStyles.div : mermaidStyles.div2} ${mermaidStyles.div3}`}
        />
      </button>

      {mounted &&
        isZoomed &&
        createPortal(
          <div
            className={mermaidStyles.div4}
            role="presentation"
            onClick={handleClose}
          >
            <div
              className={`${mermaidStyles.div6} ${isAnimating ? mermaidStyles.div5 : mermaidStyles.div2}`}
            />
            <div
              className={mermaidStyles.div7}
              role="presentation"
              onClick={(event) => event.stopPropagation()}
            >
              <div
                ref={zoomContainerRef}
                className={`mermaid-zoom ${mermaidStyles.div8}`}
              >
                <div
                  ref={zoomContentRef}
                  dangerouslySetInnerHTML={{
                    __html: svgMarkup,
                  }}
                  className="mermaid-zoom-content"
                  style={{
                    touchAction: 'none',
                  }}
                />
              </div>
            </div>
            <div
              className={`mermaid-zoom-controls ${mermaidStyles.div9} ${isAnimating ? mermaidStyles.div : mermaidStyles.div2}`}
            >
              <button
                className={mermaidStyles.button2}
                onClick={(event) => {
                  event.stopPropagation()
                  panzoomRef.current?.zoomIn()
                }}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                className={mermaidStyles.button2}
                onClick={(event) => {
                  event.stopPropagation()
                  panzoomRef.current?.zoomOut()
                }}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                className={mermaidStyles.button2}
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
              className={`${mermaidStyles.button3} ${isAnimating ? mermaidStyles.div : mermaidStyles.div2}`}
              onClick={(event) => {
                event.stopPropagation()
                handleClose()
              }}
              aria-label="Close"
            >
              <svg
                className={mermaidStyles.svg}
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
