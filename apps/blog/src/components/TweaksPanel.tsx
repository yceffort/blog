'use client'

import {Monitor, Moon, Sun} from '@yceffort/shared/components'
import {getCookie, setCookie} from '@yceffort/shared/utils'
import {useTheme} from 'next-themes'
import {useEffect, useRef, useState} from 'react'

const ACCENTS: {
  name: string
  label: string
  gradient: [string, string, string, string]
}[] = [
  {
    name: 'default',
    label: 'violet',
    gradient: ['#818cf8', '#a78bfa', '#f472b6', '#fbbf24'],
  },
  {
    name: 'rose',
    label: 'rose',
    gradient: ['#f472b6', '#fb923c', '#fbbf24', '#a78bfa'],
  },
  {
    name: 'emerald',
    label: 'emerald',
    gradient: ['#34d399', '#38bdf8', '#fbbf24', '#a78bfa'],
  },
  {
    name: 'amber',
    label: 'amber',
    gradient: ['#fbbf24', '#fb923c', '#f472b6', '#38bdf8'],
  },
  {
    name: 'cyan',
    label: 'cyan',
    gradient: ['#38bdf8', '#a78bfa', '#34d399', '#f472b6'],
  },
]

const THEMES = [
  {key: 'light', label: 'Light', Icon: Sun},
  {key: 'dark', label: 'Dark', Icon: Moon},
  {key: 'system', label: 'System', Icon: Monitor},
] as const

interface Props {
  open: boolean
  onClose: () => void
}

export default function TweaksPanel({open, onClose}: Props) {
  const {theme, setTheme} = useTheme()
  const [mounted, setMounted] = useState(false)
  const [accent, setAccent] = useState<string>('default')
  const [grain, setGrain] = useState<boolean>(true)
  const [minimal, setMinimal] = useState<boolean>(false)
  const [tilt, setTilt] = useState<number>(8)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setAccent(getCookie('tw-accent') || 'default')
    setGrain(getCookie('tw-grain') !== 'false')
    setMinimal(getCookie('tw-minimal') === 'true')
    const t = Number(getCookie('tw-tilt') || '8')
    setTilt(Number.isFinite(t) ? t : 8)
    setMounted(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) {
      return
    }
    document.body.dataset.accent = accent
    document.body.dataset.grain = String(grain)
    document.body.dataset.minimal = String(minimal)
    document.documentElement.style.setProperty('--tilt', String(tilt))
    setCookie('tw-accent', accent)
    setCookie('tw-grain', String(grain))
    setCookie('tw-minimal', String(minimal))
    setCookie('tw-tilt', String(tilt))
  }, [mounted, accent, grain, minimal, tilt])

  const handleThemeChange = (next: string, event: React.MouseEvent) => {
    setCookie('tw-theme', next)
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (!document.startViewTransition || reduced) {
      if (!reduced) {
        document.documentElement.classList.add('theme-fading')
        window.setTimeout(() => {
          document.documentElement.classList.remove('theme-fading')
        }, 280)
      }
      setTheme(next)
      return
    }
    const x = event.clientX
    const y = event.clientY
    document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
    document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)
    document.documentElement.classList.add('theme-transition-circle')
    const transition = document.startViewTransition(() => {
      setTheme(next)
    })
    void transition.finished.finally(() => {
      document.documentElement.classList.remove('theme-transition-circle')
    })
  }

  useEffect(() => {
    const cookieTheme = getCookie('tw-theme')
    if (cookieTheme && cookieTheme !== theme) {
      setTheme(cookieTheme)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [dragOffset, setDragOffset] = useState(0)
  const dragStartY = useRef<number | null>(null)

  const onHandleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
  }
  const onHandleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current == null) {
      return
    }
    const delta = e.touches[0].clientY - dragStartY.current
    setDragOffset(Math.max(0, delta))
  }
  const onHandleTouchEnd = () => {
    if (dragOffset > 80) {
      onClose()
    }
    dragStartY.current = null
    setDragOffset(0)
  }

  const dragStyle =
    dragOffset > 0
      ? {transform: `translateY(${dragOffset}px)`, transition: 'none'}
      : undefined

  return (
    <dialog
      open
      className="tweaks-panel"
      data-open={open ? 'true' : 'false'}
      aria-label="Tweaks"
      aria-hidden={!open}
      inert={!open}
      style={dragStyle}
    >
      <div
        className="tweaks-handle"
        onTouchStart={onHandleTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
        onTouchCancel={onHandleTouchEnd}
        aria-hidden="true"
      />
      <h3>
        Tweaks
        <button type="button" className="x" onClick={onClose} aria-label="닫기">
          ×
        </button>
      </h3>

      <div className="tweaks-row">
        <div className="tweaks-label">theme</div>
        <div className="tweaks-theme">
          {THEMES.map(({key, label, Icon}) => (
            <button
              key={key}
              type="button"
              className="tweaks-theme-btn"
              data-on={mounted && theme === key}
              aria-label={label}
              onClick={(e) => handleThemeChange(key, e)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tweaks-row">
        <div className="tweaks-label">accent palette</div>
        <div className="tweaks-swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.name}
              className="tweaks-sw"
              aria-label={a.label}
              data-on={accent === a.name}
              style={{
                background: `conic-gradient(${a.gradient.join(',')},${a.gradient[0]})`,
              }}
              onClick={() => setAccent(a.name)}
            />
          ))}
        </div>
      </div>

      <div className="tweaks-row">
        <label className="tweaks-label" htmlFor="tweaks-tilt">
          tilt intensity <span className="tweaks-val">{tilt}°</span>
        </label>
        <input
          id="tweaks-tilt"
          type="range"
          min={0}
          max={24}
          step={1}
          value={tilt}
          onChange={(e) => setTilt(Number(e.target.value))}
        />
      </div>

      <div className="tweaks-row tweaks-toggle">
        <div className="tweaks-label" style={{margin: 0}}>
          film grain
        </div>
        <div
          className="tweaks-switch"
          role="switch"
          aria-label="film grain"
          aria-checked={grain}
          tabIndex={0}
          data-on={grain}
          onClick={() => setGrain((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setGrain((v) => !v)
            }
          }}
        />
      </div>

      <div className="tweaks-row tweaks-toggle">
        <div className="tweaks-label" style={{margin: 0}}>
          minimal mode
        </div>
        <div
          className="tweaks-switch"
          role="switch"
          aria-label="minimal mode"
          aria-checked={minimal}
          tabIndex={0}
          data-on={minimal}
          onClick={() => setMinimal((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setMinimal((v) => !v)
            }
          }}
        />
      </div>
    </dialog>
  )
}
