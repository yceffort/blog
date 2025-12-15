'use client'

import {useEffect, useRef, useState} from 'react'

interface TOCItem {
  id: string
  text: string
  level: number
}

function TOCList({
  headings,
  activeId,
  onItemClick,
  itemRefs,
}: {
  headings: TOCItem[]
  activeId: string
  onItemClick?: () => void
  itemRefs?: React.MutableRefObject<Map<string, HTMLLIElement>>
}) {
  return (
    <ul className="space-y-2 text-sm">
      {headings.map((heading) => (
        <li
          key={heading.id}
          ref={(el) => {
            if (el && itemRefs) {
              itemRefs.current.set(heading.id, el)
            }
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
              onItemClick?.()
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
  )
}

function MobileTOC({
  headings,
  activeId,
}: {
  headings: TOCItem[]
  activeId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    const handleWindowScroll = () => {
      setShowScrollTop(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleWindowScroll)
    return () => window.removeEventListener('scroll', handleWindowScroll)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !activeId || !scrollContainerRef.current) {
      return
    }

    const activeItem = itemRefs.current.get(activeId)
    if (!activeItem) {
      return
    }

    const container = scrollContainerRef.current
    const containerRect = container.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()

    const itemTopRelative =
      itemRect.top - containerRect.top + container.scrollTop
    const itemHeight = itemRect.height
    const containerHeight = container.clientHeight

    container.scrollTo({
      top: Math.max(0, itemTopRelative - containerHeight / 2 + itemHeight / 2),
      behavior: 'smooth',
    })
  }, [isOpen, activeId])

  const activeHeading = headings.find((h) => h.id === activeId)

  const handleScrollTop = () => {
    window.scrollTo({top: 0, behavior: 'smooth'})
  }

  return (
    <div
      ref={panelRef}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 2xl:hidden"
    >
      {isOpen && (
        <div
          ref={scrollContainerRef}
          className="absolute bottom-14 right-0 mb-2 w-72 max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="sticky top-0 border-b border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              On this page
            </h2>
          </div>
          <div className="p-4 pt-2">
            <TOCList
              headings={headings}
              activeId={activeId}
              onItemClick={() => setIsOpen(false)}
              itemRefs={itemRefs}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleScrollTop}
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-lg transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${
          showScrollTop
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        }`}
        aria-label="Scroll to top"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        aria-label="Toggle table of contents"
        aria-expanded={isOpen}
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
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        <span className="max-w-32 truncate">
          {activeHeading?.text || 'Contents'}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>
    </div>
  )
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const tocRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    const article = document.querySelector('article')
    if (!article) {
      return
    }

    const elements = article.querySelectorAll('h2, h3, h4')
    const items: TOCItem[] = Array.from(elements).map((el) => ({
      id: el.id,
      text: el.textContent || '',
      level: parseInt(el.tagName[1]),
    }))
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!activeId || !tocRef.current) {
      return
    }

    const activeItem = itemRefs.current.get(activeId)
    if (!activeItem) {
      return
    }

    const container = tocRef.current
    const containerRect = container.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()

    const itemTopRelative =
      itemRect.top - containerRect.top + container.scrollTop
    const itemHeight = itemRect.height
    const containerHeight = container.clientHeight
    const scrollTop = container.scrollTop

    if (itemTopRelative < scrollTop + 60) {
      container.scrollTo({
        top: Math.max(0, itemTopRelative - 60),
        behavior: 'smooth',
      })
    } else if (
      itemTopRelative + itemHeight >
      scrollTop + containerHeight - 60
    ) {
      container.scrollTo({
        top: itemTopRelative - containerHeight + itemHeight + 60,
        behavior: 'smooth',
      })
    }
  }, [activeId])

  useEffect(() => {
    document.body.setAttribute('data-has-toc', 'true')
    return () => {
      document.body.removeAttribute('data-has-toc')
    }
  }, [])

  if (headings.length === 0) {
    return null
  }

  return (
    <>
      {/* Desktop TOC */}
      <nav className="hidden 2xl:block">
        <div
          ref={tocRef}
          className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
        >
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            On this page
          </h2>
          <div className="pb-8">
            <TOCList
              headings={headings}
              activeId={activeId}
              itemRefs={itemRefs}
            />
          </div>
        </div>
      </nav>

      {/* Mobile TOC */}
      <MobileTOC headings={headings} activeId={activeId} />
    </>
  )
}
