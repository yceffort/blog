'use client'

import Link from 'next/link'
import {useEffect, useState} from 'react'

interface TagWithCount {
  tag: string
  count: number
}

function TagCloud({tags}: {tags: TagWithCount[]}) {
  const [visibleTags, setVisibleTags] = useState<number>(0)
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleTags((prev) => {
        if (prev >= tags.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 20)

    return () => clearInterval(interval)
  }, [tags.length])

  const maxCount = Math.max(...tags.map((t) => t.count))
  const minCount = Math.min(...tags.map((t) => t.count))

  const getTagSize = (count: number) => {
    if (maxCount === minCount) return 'text-base'
    const ratio = (count - minCount) / (maxCount - minCount)
    if (ratio > 0.8) return 'text-2xl md:text-3xl'
    if (ratio > 0.6) return 'text-xl md:text-2xl'
    if (ratio > 0.4) return 'text-lg md:text-xl'
    if (ratio > 0.2) return 'text-base md:text-lg'
    return 'text-sm md:text-base'
  }

  const getTagColor = (index: number) => {
    const colors = [
      'text-green-700 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300',
      'text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300',
      'text-teal-700 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300',
      'text-cyan-700 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300',
      'text-sky-700 hover:text-sky-600 dark:text-lime-400 dark:hover:text-lime-300',
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
      {tags.map(({tag, count}, index) => {
        const isVisible = index < visibleTags
        const isHovered = hoveredTag === tag

        return (
          <Link
            key={tag}
            href={`/tags/${tag}`}
            className={`
              group relative font-mono transition-all duration-300
              ${getTagSize(count)}
              ${getTagColor(index)}
              ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              ${isHovered ? 'scale-110' : 'scale-100'}
            `}
            style={{
              transitionDelay: `${index * 15}ms`,
            }}
            onMouseEnter={() => setHoveredTag(tag)}
            onMouseLeave={() => setHoveredTag(null)}
          >
            <span className="relative">
              <span
                className={`
                  inline-block transition-transform duration-150
                  ${isHovered ? 'animate-pulse' : ''}
                `}
              >
                <span className="opacity-60">#</span>
                {tag}
              </span>
              <span
                className={`
                  ml-1 text-xs opacity-50 transition-opacity
                  ${isHovered ? 'opacity-100' : 'opacity-50'}
                `}
              >
                [{count}]
              </span>
              {isHovered && (
                <span className="absolute -bottom-1 left-0 h-0.5 w-full animate-pulse bg-current" />
              )}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

function TerminalHeader() {
  const [displayText, setDisplayText] = useState('')
  const fullText = 'ls -la ./tags'

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(interval)
      }
    }, 40)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mb-8 md:mb-12">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-lg border-2 border-green-500/50 bg-gray-900 shadow-lg shadow-green-500/10">
        <div className="flex items-center gap-2 border-b border-green-500/30 bg-gray-800 px-4 py-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="ml-2 font-mono text-xs text-gray-500">
            ~/yceffort/blog
          </span>
        </div>
        <div className="p-4">
          <div className="font-mono text-green-400">
            <span className="text-green-600">$</span> {displayText}
            <span className="ml-0.5 inline-block h-4 w-2 animate-blink bg-green-400" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatsBar({tags}: {tags: TagWithCount[]}) {
  const totalTags = tags.length
  const totalPosts = tags.reduce((sum, t) => sum + t.count, 0)

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-4 font-mono text-sm text-gray-600 dark:text-gray-400 md:mt-12">
      <span className="rounded border border-gray-300 px-3 py-1 dark:border-gray-700">
        <span className="text-green-600 dark:text-green-500">{totalTags}</span> tags
      </span>
      <span className="rounded border border-gray-300 px-3 py-1 dark:border-gray-700">
        <span className="text-cyan-600 dark:text-cyan-500">{totalPosts}</span> posts
      </span>
      <span className="rounded border border-gray-300 px-3 py-1 dark:border-gray-700">
        avg <span className="text-amber-600 dark:text-yellow-500">{(totalPosts / totalTags).toFixed(1)}</span> posts/tag
      </span>
    </div>
  )
}

export default function TagsPage() {
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tags')
      .then((res) => res.json())
      .then((data) => {
        setTags(data.tags || [])
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="font-mono text-green-500">
          <span className="animate-pulse">Loading tags...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 md:py-12">
      <TerminalHeader />
      <TagCloud tags={tags} />
      <StatsBar tags={tags} />
    </div>
  )
}
