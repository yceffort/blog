'use client'

import {memo, useEffect, useRef, useState} from 'react'

import {useTheme} from 'next-themes'

import {Monitor, Moon, Sun} from './icons/themes'

const ThemeSwitch = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const {theme, setTheme} = useTheme()
  const menuRef = useRef<HTMLDivElement>(null)

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
    <div ref={menuRef} className="relative ml-1 mr-1 sm:ml-4">
      <button
        aria-label="Theme Menu"
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
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
        <div className="absolute right-0 top-full mt-2 w-40 origin-top-right rounded-md border border-gray-100 bg-white p-2 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col space-y-1">
            <button
              className={`flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium ${
                theme === 'light'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setTheme('light')
                setMenuOpen(false)
              }}
            >
              <span className="mr-3 flex h-5 w-5 items-center justify-center">
                <Sun />
              </span>
              Light
            </button>
            <button
              className={`flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium ${
                theme === 'dark'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setTheme('dark')
                setMenuOpen(false)
              }}
            >
              <span className="mr-3 flex h-5 w-5 items-center justify-center">
                <Moon />
              </span>
              Dark
            </button>
            <button
              className={`flex w-full items-center rounded-md px-3 py-2.5 text-sm font-medium ${
                theme === 'system'
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
              onClick={() => {
                setTheme('system')
                setMenuOpen(false)
              }}
            >
              <span className="mr-3 flex h-5 w-5 items-center justify-center">
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

ThemeSwitch.DisplayName = 'ThemeSwitch'

export default memo(ThemeSwitch)
