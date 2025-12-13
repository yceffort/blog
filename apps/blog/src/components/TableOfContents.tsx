'use client'

import {useEffect, useRef, useState} from 'react'

interface TOCItem {
  id: string
  text: string
  level: number
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const tocRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    const article = document.querySelector('article')
    if (!article) return

    const elements = article.querySelectorAll('h2, h3')
    const items: TOCItem[] = Array.from(elements).map((el) => ({
      id: el.id,
      text: el.textContent || '',
      level: parseInt(el.tagName[1]),
    }))
    setHeadings(items)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      {rootMargin: '-80px 0px -80% 0px'},
    )

    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!activeId || !tocRef.current) return

    const activeItem = itemRefs.current.get(activeId)
    if (!activeItem) return

    const container = tocRef.current
    const itemTop = activeItem.offsetTop
    const itemHeight = activeItem.offsetHeight
    const containerHeight = container.clientHeight
    const scrollTop = container.scrollTop

    if (itemTop < scrollTop + 60) {
      container.scrollTo({
        top: Math.max(0, itemTop - 60),
        behavior: 'smooth',
      })
    } else if (itemTop + itemHeight > scrollTop + containerHeight - 60) {
      container.scrollTo({
        top: itemTop - containerHeight + itemHeight + 60,
        behavior: 'smooth',
      })
    }
  }, [activeId])

  if (headings.length === 0) return null

  return (
    <nav className="hidden xl:block">
      <div
        ref={tocRef}
        className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
      >
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          On this page
        </h2>
        <ul className="space-y-2 pb-8 text-sm">
          {headings.map((heading) => (
            <li
              key={heading.id}
              ref={(el) => {
                if (el) itemRefs.current.set(heading.id, el)
              }}
              style={{paddingLeft: `${(heading.level - 2) * 12}px`}}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(heading.id)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }}
                className={`block border-l-2 py-1 pl-3 transition-colors duration-200 ${
                  activeId === heading.id
                    ? 'border-primary-500 font-medium text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200'
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
