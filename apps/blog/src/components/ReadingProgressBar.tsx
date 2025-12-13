'use client'

import {useEffect, useState} from 'react'

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, scrollProgress)))
    }

    window.addEventListener('scroll', updateProgress, {passive: true})
    updateProgress()

    return () => window.removeEventListener('scroll', updateProgress)
  }, [])

  return (
    <div className="fixed left-0 top-0 z-50 h-1 w-full bg-gray-200 dark:bg-gray-700">
      <div
        className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 transition-all duration-150 ease-out"
        style={{width: `${progress}%`}}
      />
    </div>
  )
}
