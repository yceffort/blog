'use client'

import {useEffect, useState} from 'react'

import {useTheme} from 'next-themes'

import Monitor from '#components/icons/themes/monitor'
import Moon from '#components/icons/themes/moon' // Corrected import path
import Sun from '#components/icons/themes/sun' // Corrected import path

const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false)
  const {theme, setTheme} = useTheme()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  function handleButtonClick() {
    if (theme === 'system') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('light')
    } else {
      setTheme('system')
    }
  }

  if (!mounted) {
    return (
      <button
        aria-label="Toggle Theme"
        type="button"
        className="ml-1 mr-1 h-8 w-8 rounded-sm p-1 sm:ml-4"
      >
        <div className="h-6 w-6" /> {/* Placeholder to prevent layout shift */}
      </button>
    )
  }

  return (
    <button
      aria-label="Toggle Theme"
      type="button"
      className="ml-1 mr-1 h-8 w-8 rounded-sm p-1 sm:ml-4"
      onClick={handleButtonClick}
      title={
        theme === 'system'
          ? 'System'
          : theme === 'dark'
          ? 'Dark'
          : 'Light'
      }
    >
      {theme === 'system' ? (
        <Monitor />
      ) : theme === 'dark' ? (
        <Moon />
      ) : (
        <Sun />
      )}
    </button>
  )
}

export default ThemeSwitch