'use client'

import {Monitor, Moon, Sun} from '@yceffort/shared/components'
import {getCookie, setCookie} from '@yceffort/shared/utils'
import {useTheme} from 'next-themes'
import {useEffect, useState} from 'react'

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

const TRANSITIONS = [
  {key: 'slide', label: 'slide'},
  {key: 'fade', label: 'fade'},
  {key: 'zoom', label: 'zoom'},
  {key: 'none', label: 'none'},
] as const

type TransitionKey = (typeof TRANSITIONS)[number]['key']

interface Props {
  open: boolean
  onClose: () => void
}

export default function TweaksPanel({open, onClose}: Props) {
  const {theme, setTheme} = useTheme()
  const [accent, setAccent] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return 'default'
    }
    return getCookie('tw-accent') || 'default'
  })
  const [grain, setGrain] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true
    }
    return getCookie('tw-grain') !== 'false'
  })
  const [minimal, setMinimal] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return getCookie('tw-minimal') === 'true'
  })
  const [transition, setTransition] = useState<TransitionKey>(() => {
    if (typeof window === 'undefined') {
      return 'slide'
    }
    const stored = getCookie('tw-transition') as TransitionKey | undefined
    return stored && TRANSITIONS.some((t) => t.key === stored)
      ? stored
      : 'slide'
  })

  useEffect(() => {
    document.body.dataset.accent = accent
    document.body.dataset.grain = String(grain)
    document.body.dataset.minimal = String(minimal)
    document.body.dataset.transition = transition
    setCookie('tw-accent', accent)
    setCookie('tw-grain', String(grain))
    setCookie('tw-minimal', String(minimal))
    setCookie('tw-transition', transition)
    window.dispatchEvent(
      new CustomEvent('research:transition', {detail: transition}),
    )
  }, [accent, grain, minimal, transition])

  const handleThemeChange = (next: string, event: React.MouseEvent) => {
    setCookie('tw-theme', next)
    if (
      !document.startViewTransition ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTheme(next)
      return
    }
    const x = event.clientX
    const y = event.clientY
    document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
    document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)
    document.documentElement.classList.add('theme-transition-circle')
    const viewTransition = document.startViewTransition(() => {
      setTheme(next)
    })
    viewTransition.finished.finally(() => {
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

  if (!open) {
    return null
  }

  return (
    <div className="tweaks-panel" role="dialog" aria-label="Tweaks">
      <h3>
        Tweaks
        <span
          className="x"
          role="button"
          tabIndex={0}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onClose()
            }
          }}
        >
          ×
        </span>
      </h3>

      <div className="tweaks-row">
        <div className="tweaks-label">theme</div>
        <div className="tweaks-theme">
          {THEMES.map(({key, label, Icon}) => (
            <button
              key={key}
              type="button"
              className="tweaks-theme-btn"
              data-on={theme === key}
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

      <div className="tweaks-row">
        <div className="tweaks-label">slide transition</div>
        <div className="tweaks-theme">
          {TRANSITIONS.map(({key, label}) => (
            <button
              key={key}
              type="button"
              className="tweaks-theme-btn"
              data-on={transition === key}
              aria-label={label}
              onClick={() => setTransition(key)}
            >
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
