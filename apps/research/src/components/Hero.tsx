'use client'

import {memo, useEffect, useState, useCallback, useRef} from 'react'

import {SiteConfig} from '@/config'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'

function ScrambleText({
  text,
  delay = 0,
  className = '',
}: {
  text: string
  delay?: number
  className?: string
}) {
  const [display, setDisplay] = useState('')
  const [started, setStarted] = useState(false)
  const frameRef = useRef(0)
  const startTimeRef = useRef(0)

  const animate = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current
    const duration = 1200
    const progress = Math.min(elapsed / duration, 1)

    const revealed = Math.floor(progress * text.length)
    let result = ''
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        result += ' '
      } else if (i < revealed) {
        result += text[i]
      } else {
        result += CHARS[Math.floor(Math.random() * CHARS.length)]
      }
    }
    setDisplay(result)

    if (progress < 1) {
      frameRef.current = requestAnimationFrame(animate)
    }
  }, [text])

  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true)
      startTimeRef.current = Date.now()
      frameRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(frameRef.current)
    }
  }, [animate, delay])

  if (!started) {
    return <span className={`${className} invisible`}>{text}</span>
  }

  return <span className={className}>{display}</span>
}

const Hero = memo(function Hero() {
  return (
    <div className="relative mb-8 py-10 sm:py-14 lg:py-16">
      <div className="mx-auto w-full">
        {/* Subtitle */}
        <p className="hero-fade-1 mb-3 font-mono text-xs tracking-[0.3em] text-sky-600 dark:text-sky-400 sm:text-sm">
          <ScrambleText text="RESEARCH LAB" delay={200} />
        </p>

        {/* Name */}
        <h1 className="mb-4 font-black leading-tight tracking-tighter sm:mb-5">
          <span className="hero-gradient-text block bg-gradient-to-r from-sky-600 via-teal-600 via-50% to-emerald-600 bg-[length:200%_auto] bg-clip-text text-[14vw] text-transparent dark:from-sky-400 dark:via-teal-400 dark:to-emerald-400 sm:text-[11vw] md:text-[9vw] lg:text-[7vw]">
            <ScrambleText text={SiteConfig.author.name} delay={400} />
          </span>
        </h1>

        {/* Animated divider */}
        <div className="hero-fade-2 mb-4 sm:mb-5">
          <div className="hero-glow-line h-px w-full bg-gradient-to-r from-sky-500/60 via-teal-500/40 to-transparent dark:from-sky-500/80 dark:via-teal-500/60" />
        </div>

        {/* Description */}
        <p className="hero-fade-2 mb-5 max-w-md text-sm text-gray-600 dark:text-gray-400 sm:mb-6 sm:text-base">
          발표 자료와 기술 연구 노트를 공유하는 공간
        </p>

      </div>
    </div>
  )
})

export default Hero
