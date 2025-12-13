'use client'

import {useEffect, useState} from 'react'

import Link from 'next/link'

import {SiteConfig} from '#src/config'

const TYPING_TEXTS = [
  'Frontend Developer',
  'Open Source Enthusiast',
  'Tech Blogger',
  'Book Author',
  'Code Craftsman',
]

export default function Hero() {
  const [displayText, setDisplayText] = useState('')
  const [textIndex, setTextIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentText = TYPING_TEXTS[textIndex]
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (displayText.length < currentText.length) {
            setDisplayText(currentText.slice(0, displayText.length + 1))
          } else {
            setTimeout(() => setIsDeleting(true), 2000)
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText(displayText.slice(0, -1))
          } else {
            setIsDeleting(false)
            setTextIndex((prev) => (prev + 1) % TYPING_TEXTS.length)
          }
        }
      },
      isDeleting ? 50 : 100,
    )

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, textIndex])

  return (
    <div className="relative mb-8 overflow-hidden rounded-xl border-2 border-black bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-gray-600 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:shadow-[6px_6px_0px_0px_rgba(82,82,91,1)] sm:p-8 md:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.15),transparent_50%)]" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="ml-2 font-mono text-xs text-gray-500">
            ~/yceffort
          </span>
        </div>

        <div className="font-mono">
          <div className="mb-2 text-gray-500 dark:text-gray-400">
            <span className="text-green-600 dark:text-green-400">➜</span>{' '}
            <span className="text-cyan-600 dark:text-cyan-400">~</span>{' '}
            <span className="text-gray-500">cat</span> intro.md
          </div>

          <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl md:text-4xl">
            👋 Hi, I&apos;m{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400">
              {SiteConfig.author.name}
            </span>
          </h1>

          <div className="mb-4 flex items-center text-base text-gray-700 dark:text-gray-300 sm:text-lg md:text-xl">
            <span className="text-yellow-500 dark:text-yellow-400">&gt;</span>
            <span className="ml-2">{displayText}</span>
            <span className="ml-0.5 inline-block h-5 w-2 animate-blink bg-green-500 dark:bg-green-400 sm:h-6" />
          </div>

          <p className="mb-6 max-w-2xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            {SiteConfig.subtitle}
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-indigo-500 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-600 transition-all hover:bg-indigo-500/20 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 dark:hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              About Me
            </Link>
            <Link
              href="/tags"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-pink-500 bg-pink-500/10 px-4 py-2 text-sm font-medium text-pink-600 transition-all hover:bg-pink-500/20 hover:shadow-[0_0_20px_rgba(236,72,153,0.2)] dark:bg-pink-500/20 dark:text-pink-300 dark:hover:bg-pink-500/30 dark:hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]"
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
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Browse Tags
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl dark:bg-indigo-500/10" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pink-500/5 blur-3xl dark:bg-pink-500/10" />
    </div>
  )
}
