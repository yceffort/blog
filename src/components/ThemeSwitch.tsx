'use client'

import {useEffect, useRef, useState} from 'react'

import {useTheme} from 'next-themes'

import Monitor from '#components/icons/themes/monitor'
import Moon from '#components/icons/themes/moon'
import Sun from '#components/icons/themes/sun'

const ThemeSwitch = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const {theme, setTheme} = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="relative ml-1 mr-1 sm:ml-4" ref={menuRef}>
      <button
        aria-label="Theme Menu"
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {theme === 'system' ? (
          <Monitor />
        ) : theme === 'dark' ? (
          <Moon />
        ) : (
          <Sun />
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-36 origin-top-right rounded-md border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col space-y-1">
            <button
              className={`flex w-full items-center rounded-md px-2 py-2 text-sm ${
                theme === 'light'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setTheme('light')
                setMenuOpen(false)
              }}
            >
              <span className="mr-2 h-4 w-4">
                <Sun />
              </span>
              Light
            </button>
            <button
              className={`flex w-full items-center rounded-md px-2 py-2 text-sm ${
                theme === 'dark'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setTheme('dark')
                setMenuOpen(false)
              }}
            >
              <span className="mr-2 h-4 w-4">
                <Moon />
              </span>
              Dark
            </button>
            <button
              className={`flex w-full items-center rounded-md px-2 py-2 text-sm ${
                theme === 'system'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setTheme('system')
                setMenuOpen(false)
              }}
            >
              <span className="mr-2 h-4 w-4">
                <Monitor />
              </span>
              System
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThemeSwitch
