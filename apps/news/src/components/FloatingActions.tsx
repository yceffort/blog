'use client'

import {useEffect, useRef, useState} from 'react'

import * as styles from '@/components/FloatingActions.styles'

interface Heading {
  el: HTMLElement
  text: string
  section: boolean
}

const SHARE_FEEDBACK_MS = 2000

export default function FloatingActions() {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // h2는 절, h3는 항목이다. 마크다운 렌더러가 id를 달지 않으므로 요소를 직접 잡는다.
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('.news-body h2, .news-body h3'),
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(
      elements.map((el) => ({
        el,
        text: el.textContent ?? '',
        section: el.tagName === 'H2',
      })),
    )
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target as HTMLElement)
        }
      },
      {rootMargin: '-80px 0px -80% 0px'},
    )
    for (const el of elements) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', update, {passive: true})
    update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    },
    [],
  )

  const share = async () => {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({title: document.title, url})
        return
      } catch (error) {
        // 사용자가 공유 시트를 닫은 것이면 끝내고, 브라우저가 거부한 것이면 복사로 넘어간다.
        if ((error as Error).name === 'AbortError') return
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), SHARE_FEEDBACK_MS)
  }

  return (
    <div ref={rootRef} className={styles.root}>
      {headings.length > 0 && (
        <div
          className={styles.panel}
          data-open={open ? 'true' : 'false'}
          aria-hidden={!open}
          inert={!open}
        >
          <p className={styles.panelTitle}>이 호의 목차</p>
          <ul className={styles.list}>
            {headings.map((h) => (
              <li key={`${h.section ? 's' : 'i'}-${h.text}`}>
                <button
                  type="button"
                  className={h.section ? styles.section : styles.item}
                  data-active={active === h.el ? 'true' : 'false'}
                  onClick={() => {
                    h.el.scrollIntoView({behavior: 'smooth', block: 'start'})
                    setOpen(false)
                  }}
                >
                  {h.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className={scrolled ? styles.button : styles.buttonHidden}
        onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
        aria-label="맨 위로"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {headings.length > 0 && (
        <button
          type="button"
          className={styles.dial}
          onClick={() => setOpen((v) => !v)}
          aria-label="목차 열기"
          aria-expanded={open}
          style={{['--progress' as never]: `${progress}`}}
        >
          <svg viewBox="0 0 36 36" className={styles.dialSvg}>
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              strokeWidth="2"
              className={styles.dialTrack}
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              className={styles.dialFill}
            />
          </svg>
          <span className={styles.dialNum}>{Math.round(progress)}</span>
        </button>
      )}

      <output className={styles.toast} data-show={copied ? 'true' : 'false'}>
        링크를 복사했습니다
      </output>

      <button
        type="button"
        className={styles.button}
        onClick={share}
        aria-label="이 호 공유하기"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>
      </button>
    </div>
  )
}
