'use client'

import Link from 'next/link'
import {memo, useEffect, useState} from 'react'

interface MenuItem {
  label: string
  path: string
}

interface MobileNavProps {
  menu: MenuItem[]
}

const MobileNav = memo(function MobileNav({menu}: MobileNavProps) {
  const [navShow, setNavShow] = useState(false)

  const onToggleNav = () => {
    setNavShow((status) => {
      document.body.style.overflow = status ? 'auto' : 'hidden'
      return !status
    })
  }

  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  return (
    <div className="sm:hidden">
      <button
        type="button"
        className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Toggle Menu"
        onClick={onToggleNav}
      >
        <svg
          className="h-6 w-6 text-gray-700 dark:text-gray-200"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={navShow ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
          />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          navShow ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onToggleNav}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[101] transition-[translate,opacity] duration-300 ease-out ${
          navShow
            ? 'translate-y-0 opacity-100'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="rounded-t-3xl border-t border-gray-200 bg-white px-6 pb-8 pt-4 dark:border-gray-700 dark:bg-gray-900">
          {/* Handle */}
          <div className="mb-6 flex justify-center">
            <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            {menu.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-lg font-semibold text-gray-900 transition-colors hover:bg-gray-100 active:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                onClick={onToggleNav}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Close Button */}
          <button
            type="button"
            className="mt-4 w-full rounded-xl bg-gray-100 py-3.5 text-base font-semibold text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={onToggleNav}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
})

export default MobileNav
