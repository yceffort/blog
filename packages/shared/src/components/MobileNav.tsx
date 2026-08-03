'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {memo, useCallback, useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'

interface MenuItem {
  label: string
  path: string
}

interface MobileNavProps {
  menu: MenuItem[]
}

const EXIT_MS = 280

const MobileNav = memo(function MobileNavBase({menu}: MobileNavProps) {
  const pathname = usePathname() ?? '/'
  const [mounted, setMounted] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [open, setOpen] = useState(false)
  const rafRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNav()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closeNav])

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
    <div className="sm:hidden">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
        aria-label="Toggle Menu"
        aria-expanded={open}
        onClick={toggleNav}
        style={{color: 'var(--ink-2)'}}
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
            d={open ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
          />
        </svg>
      </button>

      {mounted &&
        rendered &&
        createPortal(
          <>
            <div
              className={`fixed inset-0 z-[100] transition-opacity duration-300 ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
              style={{
                background: 'rgba(0, 0, 0, 0.55)',
                backdropFilter: 'blur(6px) saturate(130%)',
                WebkitBackdropFilter: 'blur(6px) saturate(130%)',
              }}
              onClick={closeNav}
            />

            <div
              className={`fixed inset-x-0 bottom-0 z-[101] transition-[translate,opacity] duration-300 ease-out ${
                open
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-full opacity-0'
              }`}
            >
              <div
                className="rounded-t-[28px] px-5 pb-7 pt-3"
                style={{
                  background: 'var(--surface)',
                  borderTop: '1px solid var(--border-2)',
                  boxShadow: '0 -24px 60px -20px rgba(0, 0, 0, 0.45)',
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                <div className="mb-5 flex justify-center">
                  <div
                    className="h-[5px] w-11 rounded-full"
                    style={{background: 'var(--border-2)'}}
                  />
                </div>

                <div
                  className="mb-3 px-3 text-[10px] font-medium uppercase"
                  style={{
                    color: 'var(--ink-4)',
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '0.18em',
                  }}
                >
                  Navigation
                </div>

                <nav className="flex flex-col gap-1">
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
                      className:
                        'group relative flex items-center gap-4 rounded-2xl px-4 py-3.5 transition-colors',
                    } as const
                    const content = (
                      <>
                        <span
                          className="text-[11px] tabular-nums"
                          style={{
                            fontFamily: 'var(--font-mono), monospace',
                            color: active ? 'var(--primary)' : 'var(--ink-4)',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="flex-1 text-[17px] font-semibold"
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
                            className="h-1.5 w-1.5 rounded-full"
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
                  className="mt-5 w-full rounded-2xl py-3.5 text-sm font-medium transition-colors"
                  style={{
                    background: 'var(--surface-2)',
                    color: 'var(--ink-3)',
                    border: '1px solid var(--border)',
                  }}
                  onClick={closeNav}
                >
                  Close
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
})

export default MobileNav
