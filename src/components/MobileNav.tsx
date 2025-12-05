'use client'

import Link from 'next/link'
import {memo, useEffect, useState} from 'react'

import {SiteConfig} from '#src/config'

const MobileNav = memo(() => {
  const [navShow, setNavShow] = useState(false)

  const onToggleNav = () => {
    setNavShow((status) => {
      if (status) {
        document.body.style.overflow = 'auto'
      } else {
        // Prevent scrolling
        document.body.style.overflow = 'hidden'
      }
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
        className="ml-1 mr-1 h-8 w-8 rounded-sm"
        aria-label="Toggle Menu"
        onClick={onToggleNav}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-gray-900 dark:text-gray-100"
        >
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/50 backdrop-blur-sm duration-300 ease-in-out ${
          navShow ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        onClick={onToggleNav}
      >
        <div
          className="relative mx-4 flex w-full max-w-sm flex-col items-center rounded-[2rem] border-2 border-gray-500 bg-white p-8 shadow-brutal dark:border-white dark:bg-gray-950 dark:shadow-brutal-dark"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border-2 border-gray-500 bg-secondary text-black shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none dark:border-white dark:bg-primary"
            aria-label="Close Menu"
            onClick={onToggleNav}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-6 w-6"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <nav className="mt-8 flex w-full flex-col space-y-4">
            {SiteConfig.menu.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="w-full rounded-xl border-2 border-gray-500 bg-white py-3 text-center text-xl font-black text-black shadow-brutal-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-primary hover:shadow-none dark:border-white dark:bg-gray-950 dark:text-white dark:hover:bg-secondary dark:hover:text-black"
                onClick={onToggleNav}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )
})

export default MobileNav
