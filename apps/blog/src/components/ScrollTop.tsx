'use client'

import {useEffect, useState} from 'react'

export default function ScrollTop() {
  const [show, setShow] = useState(false)
  const [hasTOC, setHasTOC] = useState(false)

  useEffect(() => {
    const handleWindowScroll = () => {
      if (window.scrollY > 50) {
        setShow(true)
      } else {
        setShow(false)
      }
    }

    const checkTOC = () => {
      setHasTOC(document.body.hasAttribute('data-has-toc'))
    }

    const observer = new MutationObserver(checkTOC)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-has-toc'],
    })

    checkTOC()
    window.addEventListener('scroll', handleWindowScroll)
    return () => {
      window.removeEventListener('scroll', handleWindowScroll)
      observer.disconnect()
    }
  }, [])

  const handleScrollTop = () => {
    window.scrollTo({top: 0, behavior: 'smooth'})
  }

  if (hasTOC) {
    return null
  }

  return (
    <button
      aria-label="Scroll To Top"
      type="button"
      onClick={handleScrollTop}
      className={`fixed right-8 bottom-8 z-50 rounded-full bg-gray-200 p-2 text-gray-500 transition-all hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
}
