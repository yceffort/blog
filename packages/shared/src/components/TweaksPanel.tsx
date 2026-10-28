'use client'

import {useTheme} from 'next-themes'
import {useEffect, useRef, useState, type ReactNode} from 'react'

import {getCookie, setCookie} from '../utils/cookie'
import {Monitor, Moon, Sun} from './icons/themes'
import * as tweaksStyles from './TweaksPanel.styles'

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
  {
    key: 'light',
    label: 'Light',
    Icon: Sun,
  },
  {
    key: 'dark',
    label: 'Dark',
    Icon: Moon,
  },
  {
    key: 'system',
    label: 'System',
    Icon: Monitor,
  },
] as const

// 앱마다 다른 항목(blog의 tilt와 새 글 알림, research의 slide transition)은 children으로 공통 항목 뒤에 붙인다
interface Props {
  open: boolean
  onClose: () => void
  children?: ReactNode
}
export function TweaksPanel({open, onClose, children}: Props) {
  const {theme, setTheme} = useTheme()
  const [mounted, setMounted] = useState(false)
  const [accent, setAccent] = useState<string>('default')
  const [grain, setGrain] = useState<boolean>(true)
  const [minimal, setMinimal] = useState<boolean>(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // 세 사이트가 .yceffort.kr 쿠키를 공유하므로, 다른 탭에서 바꾼 값을 탭이 다시 보일 때 반영한다.
    const syncFromCookie = () => {
      if (document.visibilityState === 'hidden') {
        return
      }
      setAccent(getCookie('tw-accent') || 'default')
      setGrain(getCookie('tw-grain') !== 'false')
      setMinimal(getCookie('tw-minimal') === 'true')
      const cookieTheme = getCookie('tw-theme')
      if (cookieTheme) {
        setTheme(cookieTheme)
      }
    }
    syncFromCookie()
    setMounted(true)
    document.addEventListener('visibilitychange', syncFromCookie)
    window.addEventListener('pageshow', syncFromCookie)
    return () => {
      document.removeEventListener('visibilitychange', syncFromCookie)
      window.removeEventListener('pageshow', syncFromCookie)
    }
  }, [setTheme])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) {
      return
    }
    document.body.dataset.accent = accent
    document.body.dataset.grain = String(grain)
    document.body.dataset.minimal = String(minimal)
    setCookie('tw-accent', accent)
    setCookie('tw-grain', String(grain))
    setCookie('tw-minimal', String(minimal))
  }, [mounted, accent, grain, minimal])
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
      ? {
          transform: `translateY(${dragOffset}px)`,
          transition: 'none',
        }
      : undefined
  return (
    <dialog
      open
      className={tweaksStyles.tweaks_panel}
      data-open={open ? 'true' : 'false'}
      aria-label="Tweaks"
      aria-hidden={!open}
      inert={!open}
      style={dragStyle}
    >
      <div
        className={tweaksStyles.tweaks_handle}
        onTouchStart={onHandleTouchStart}
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
        onTouchCancel={onHandleTouchEnd}
        aria-hidden="true"
      />
      <h3 className={tweaksStyles.element_h3}>
        Tweaks
        <button
          type="button"
          className={tweaksStyles.x}
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
      </h3>

      <div>
        <div className={tweaksStyles.tweaks_label}>theme</div>
        <div className={tweaksStyles.tweaks_theme}>
          {THEMES.map(({key, label, Icon}) => (
            <button
              key={key}
              type="button"
              className={tweaksStyles.tweaks_theme_btn}
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

      <div className={tweaksStyles.tweaks_row_next}>
        <div className={tweaksStyles.tweaks_label}>accent palette</div>
        <div className={tweaksStyles.tweaks_swatches}>
          {ACCENTS.map((a) => (
            <button
              key={a.name}
              className={tweaksStyles.tweaks_sw}
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

      <TweaksSwitchRow
        label="film grain"
        on={grain}
        onToggle={() => setGrain((v) => !v)}
      />
      <TweaksSwitchRow
        label="minimal mode"
        on={minimal}
        onToggle={() => setMinimal((v) => !v)}
      />
      {children}
    </dialog>
  )
}

export function TweaksSwitchRow({
  label,
  on,
  busy,
  onToggle,
}: {
  label: string
  on: boolean
  busy?: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`${tweaksStyles.tweaks_row_next} ${tweaksStyles.tweaks_toggle}`}
    >
      <div className={tweaksStyles.tweaks_label} style={{margin: 0}}>
        {label}
      </div>
      <div
        className={tweaksStyles.tweaks_switch}
        role="switch"
        aria-label={label}
        aria-checked={on}
        aria-busy={busy}
        tabIndex={0}
        data-on={on}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onToggle()
          }
        }}
      />
    </div>
  )
}
