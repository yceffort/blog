'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {memo, useCallback, useEffect, useRef, useState} from 'react'
import type {PointerEvent as ReactPointerEvent, MouseEvent} from 'react'
import {createPortal} from 'react-dom'

export interface MobileNavClassNames {
  root: string
  toggle: string
  toggleIcon: string
  visible: string
  hidden: string
  backdrop: string
  sheetVisible: string
  sheetHidden: string
  sheet: string
  dialog: string
  handleContainer: string
  handle: string
  heading: string
  nav: string
  link: string
  index: string
  label: string
  activeDot: string
  close: string
}

interface MenuItem {
  label: string
  path: string
}

interface MobileNavProps {
  menu: MenuItem[]
  classNames: MobileNavClassNames
}

// 닫힘 전환(220ms)이 끝난 뒤에 언마운트한다
const EXIT_MS = 260
// 이 거리를 넘기면 탭이 아니라 드래그로 본다
const DRAG_SLOP_PX = 6
const DISMISS_RATIO = 0.3
const DISMISS_VELOCITY = 0.5 // px/ms
const DECELERATE = 'cubic-bezier(0.32, 0.72, 0, 1)'

interface DragState {
  pointerId: number
  startY: number
  lastY: number
  lastTime: number
  velocity: number
  offset: number
}

const MobileNav = memo(function MobileNavBase({
  menu,
  classNames,
}: MobileNavProps) {
  const pathname = usePathname() ?? '/'
  const [rendered, setRendered] = useState(false)
  const [open, setOpen] = useState(false)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragState | null>(null)
  const draggedRef = useRef(false)

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      document.body.style.overflow = ''
    }
  }, [])

  const closeNav = useCallback(() => {
    setOpen(false)
    document.body.style.overflow = ''
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => setRendered(false), EXIT_MS)
  }, [])

  const openNav = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    setRendered(true)
    document.body.style.overflow = 'hidden'
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => setOpen(true))
    })
  }, [])

  const toggleNav = useCallback(() => {
    if (open) {
      closeNav()
    } else {
      openNav()
    }
  }, [open, openNav, closeNav])

  useEffect(() => {
    if (!open) {
      return undefined
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNav()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeNav])

  const onPointerDown = (e: ReactPointerEvent<HTMLDialogElement>) => {
    if (!open || !e.isPrimary || e.button !== 0) {
      return
    }
    draggedRef.current = false
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastTime: e.timeStamp,
      velocity: 0,
      offset: 0,
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDialogElement>) => {
    const drag = dragRef.current
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!drag || e.pointerId !== drag.pointerId || !sheet || !backdrop) {
      return
    }
    const offset = Math.max(0, e.clientY - drag.startY)
    if (!draggedRef.current) {
      if (offset < DRAG_SLOP_PX) {
        return
      }
      draggedRef.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      sheet.style.transition = 'none'
      backdrop.style.transition = 'none'
    }
    const dt = e.timeStamp - drag.lastTime
    if (dt > 0) {
      drag.velocity = (e.clientY - drag.lastY) / dt
    }
    drag.lastY = e.clientY
    drag.lastTime = e.timeStamp
    drag.offset = offset
    sheet.style.translate = `0 ${offset}px`
    backdrop.style.opacity = String(1 - offset / sheet.offsetHeight)
  }

  const onPointerEnd = (e: ReactPointerEvent<HTMLDialogElement>) => {
    const drag = dragRef.current
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!drag || e.pointerId !== drag.pointerId) {
      return
    }
    dragRef.current = null
    if (!draggedRef.current || !sheet || !backdrop) {
      return
    }
    // 인라인 값을 지우면 클래스의 전환이 현재 위치에서 이어받는다
    sheet.style.transition = ''
    sheet.style.translate = ''
    backdrop.style.transition = ''
    backdrop.style.opacity = ''
    const dismiss =
      e.type === 'pointerup' &&
      (drag.offset > sheet.offsetHeight * DISMISS_RATIO ||
        drag.velocity > DISMISS_VELOCITY)
    if (dismiss) {
      // 이미 움직이는 중이므로 가속 대신 감속 곡선으로 빠져나간다
      sheet.style.transitionTimingFunction = DECELERATE
      closeNav()
    }
  }

  const onClickCapture = (e: MouseEvent) => {
    if (draggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      draggedRef.current = false
    }
  }

  const isActive = (path: string) => {
    if (path.startsWith('http')) {
      return false
    }
    if (path.endsWith('/pages/1')) {
      const base = path.replace(/\/pages\/1$/, '/pages')
      return pathname === path || pathname.startsWith(`${base}/`)
    }
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <div className={classNames.root}>
      <button
        type="button"
        className={classNames.toggle}
        aria-label="Toggle Menu"
        aria-expanded={open}
        onClick={toggleNav}
        style={{color: 'var(--ink-2)'}}
      >
        <svg
          className={classNames.toggleIcon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
          />
        </svg>
      </button>

      {rendered &&
        createPortal(
          <>
            <div
              ref={backdropRef}
              className={`${classNames.backdrop} ${
                open ? classNames.visible : classNames.hidden
              }`}
              style={{
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(6px) saturate(130%)',
                WebkitBackdropFilter: 'blur(6px) saturate(130%)',
              }}
              role="presentation"
              onClick={closeNav}
            />

            <div
              ref={sheetRef}
              className={`${classNames.sheet} ${
                open ? classNames.sheetVisible : classNames.sheetHidden
              }`}
            >
              <dialog
                open
                className={classNames.dialog}
                style={{
                  background: 'var(--surface)',
                  borderTop: '1px solid var(--border-2)',
                  boxShadow: '0 -24px 60px -20px rgba(0, 0, 0, 0.45)',
                  touchAction: 'none',
                }}
                aria-modal="true"
                aria-label="Navigation menu"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onClickCapture={onClickCapture}
              >
                <div className={classNames.handleContainer}>
                  <div
                    className={classNames.handle}
                    style={{background: 'var(--border-2)'}}
                  />
                </div>

                <div
                  className={classNames.heading}
                  style={{
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '0.18em',
                  }}
                >
                  Navigation
                </div>

                <nav className={classNames.nav}>
                  {menu.map((link, i) => {
                    const external = link.path.startsWith('http')
                    const active = isActive(link.path)
                    const common = {
                      onClick: closeNav,
                      'data-active': active ? 'true' : 'false',
                      style: active
                        ? {
                            background:
                              'color-mix(in oklab, var(--primary) 12%, var(--surface-2))',
                            boxShadow:
                              'inset 0 0 0 1px color-mix(in oklab, var(--primary) 28%, transparent)',
                          }
                        : undefined,
                      className: classNames.link,
                    } as const
                    const content = (
                      <>
                        <span
                          className={classNames.index}
                          style={{
                            fontFamily: 'var(--font-mono), monospace',
                            color: active ? 'var(--primary)' : 'var(--ink-4)',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={classNames.label}
                          style={{
                            color: active ? 'var(--ink)' : 'var(--ink-2)',
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {link.label}
                        </span>
                        {external ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{color: 'var(--ink-3)'}}
                            aria-hidden="true"
                          >
                            <path d="M7 17L17 7" />
                            <path d="M8 7h9v9" />
                          </svg>
                        ) : active ? (
                          <span
                            className={classNames.activeDot}
                            style={{
                              background: 'var(--primary-3)',
                              boxShadow: '0 0 10px var(--primary-3)',
                            }}
                          />
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{color: 'var(--ink-4)'}}
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="M13 5l7 7-7 7" />
                          </svg>
                        )}
                      </>
                    )
                    return external ? (
                      <a
                        key={link.path}
                        href={link.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        {...common}
                      >
                        {content}
                      </a>
                    ) : (
                      <Link key={link.path} href={link.path} {...common}>
                        {content}
                      </Link>
                    )
                  })}
                </nav>

                <button
                  type="button"
                  className={classNames.close}
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--ink-3)',
                    border: '1px solid var(--border)',
                  }}
                  onClick={closeNav}
                >
                  Close
                </button>
              </dialog>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
})

export default MobileNav
