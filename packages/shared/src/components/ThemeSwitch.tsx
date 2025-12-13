'use client'

import {memo, useCallback, useEffect, useRef, useState} from 'react'

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

  const handleThemeChange = useCallback(
    (newTheme: string, event: React.MouseEvent) => {
      const x = event.clientX
      const y = event.clientY

      if (
        !document.startViewTransition ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setTheme(newTheme)
        setMenuOpen(false)
        return
      }

      document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
      document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)
      document.documentElement.classList.add('theme-transition-circle')

      const transition = document.startViewTransition(() => {
        setTheme(newTheme)
      })

      transition.finished.then(() => {
        document.documentElement.classList.remove('theme-transition-circle')
      })

      setMenuOpen(false)
    },
    [setTheme],
  )

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
              onClick={(e) => handleThemeChange('light', e)}
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
              onClick={(e) => handleThemeChange('dark', e)}
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
              onClick={(e) => handleThemeChange('system', e)}
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
