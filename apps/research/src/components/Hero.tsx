'use client'

import Link from 'next/link'
import {memo, useEffect, useState} from 'react'

import {SiteConfig} from '@/config'

const TYPING_TEXTS = [
  'Tech Talks',
  'Conference Slides',
  'Knowledge Sharing',
  'Deep Dives',
  'Research Notes',
]

const ActionButtons = memo(function ActionButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={SiteConfig.menu[0].path}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-sky-500 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-600 transition-all hover:bg-sky-500/20 hover:shadow-[0_0_20px_rgba(14,165,233,0.2)] dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 dark:hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]"
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
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        Visit Blog
      </Link>
      <a
        href={`https://github.com/${SiteConfig.author.contacts.github?.split('/').pop()}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border-2 border-purple-500 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-600 transition-all hover:bg-purple-500/20 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30 dark:hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
        GitHub
      </a>
    </div>
  )
})

const TypingText = memo(function TypingText() {
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
    <div className="mb-4 flex items-center text-base text-gray-700 dark:text-gray-300 sm:text-lg md:text-xl">
      <span className="text-amber-500 dark:text-amber-400">&gt;</span>
      <span className="ml-2">{displayText}</span>
      <span className="ml-0.5 inline-block h-5 w-2 animate-blink bg-sky-500 dark:bg-sky-400 sm:h-6" />
    </div>
  )
})

const Hero = memo(function Hero() {
  return (
    <div className="relative mb-8 overflow-hidden rounded-xl border-2 border-black bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:border-gray-600 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 dark:shadow-[6px_6px_0px_0px_rgba(82,82,91,1)] sm:p-8 md:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.1),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.15),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.15),transparent_50%)]" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="ml-2 font-mono text-xs text-gray-500">
            ~/research
          </span>
        </div>

        <div className="font-mono">
          <div className="mb-2 text-gray-500 dark:text-gray-400">
            <span className="text-green-600 dark:text-green-400">➜</span>{' '}
            <span className="text-sky-600 dark:text-sky-400">~</span>{' '}
            <span className="text-gray-500">ls</span> ./slides
          </div>

          <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl md:text-4xl">
            🧪{' '}
            <span className="bg-gradient-to-r from-sky-600 via-violet-600 to-purple-600 bg-clip-text text-transparent dark:from-sky-400 dark:via-violet-400 dark:to-purple-400">
              Research Lab
            </span>
          </h1>

          <TypingText />

          <p className="mb-6 max-w-2xl text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            {SiteConfig.author.name}의 발표 자료와 기술 연구 노트를 공유하는
            공간입니다.
          </p>

          <ActionButtons />
        </div>
      </div>

      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-500/5 blur-3xl dark:bg-sky-500/10" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-500/5 blur-3xl dark:bg-purple-500/10" />
    </div>
  )
})

export default Hero
