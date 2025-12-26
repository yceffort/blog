'use client'

import Link from 'next/link'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

const LOCAL_STORAGE_KEY = 'hideOpenToWorkBanner'

function getHideBannerPreference(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const BannerContext = createContext<boolean>(false)

export function useBannerVisible() {
  return useContext(BannerContext)
}

export function OpenToWorkBannerProvider({children}: {children: ReactNode}) {
  const [isHidden, setIsHidden] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsHidden(getHideBannerPreference())
  }, [])

  const handleClose = useCallback(() => {
    setIsHidden(true)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, 'true')
    } catch {
      // ignore localStorage errors
    }
  }, [])

  const isVisible = !isHidden

  return (
    <BannerContext.Provider value={isVisible}>
      {isVisible && (
        <Link
          href="/about"
          className="fixed top-0 left-0 right-0 z-50 group block w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 px-4 py-2 text-center text-sm text-white transition-all hover:from-emerald-400 hover:via-green-400 hover:to-teal-400 dark:from-emerald-600 dark:via-green-600 dark:to-teal-600 dark:hover:from-emerald-500 dark:hover:via-green-500 dark:hover:to-teal-500"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="font-medium">Open to Work</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Contact me for opportunities
            </span>
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleClose()
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="배너 닫기"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </Link>
      )}
      {children}
    </BannerContext.Provider>
  )
}

const OpenToWorkBanner = () => null

export default OpenToWorkBanner
