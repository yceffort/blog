'use client'

import {useEffect, useRef, useState} from 'react'

interface TOCItem {
  id: string
  text: string
  level: number
}

const handleScrollTop = () => {
  window.scrollTo({top: 0, behavior: 'smooth'})
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
    <ul>
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
            data-active={activeId === heading.id ? 'true' : 'false'}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(heading.id)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
              onItemClick?.()
            }}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  )
}

function FloatingTOC({
  headings,
  activeId,
}: {
  headings: TOCItem[]
  activeId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const p = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, p)))
      setShowScrollTop(scrollTop > 50)
    }

    window.addEventListener('scroll', update, {passive: true})
    update()
    return () => window.removeEventListener('scroll', update)
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
    return undefined
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
    return undefined
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

  const rounded = Math.round(progress)

  return (
    <div ref={panelRef} className="floating-toc">
      <div
        ref={scrollContainerRef}
        className="floating-toc-panel"
        data-open={isOpen ? 'true' : 'false'}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="floating-toc-header">
          <h2>On this page</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close table of contents"
            className="floating-toc-close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="floating-toc-list">
          <TOCList
            headings={headings}
            activeId={activeId}
            onItemClick={() => setIsOpen(false)}
            itemRefs={itemRefs}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleScrollTop}
        className="floating-toc-scroll-top"
        data-show={showScrollTop ? 'true' : 'false'}
        aria-label="Scroll to top"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="reading-progress-dial"
        data-visible="true"
        aria-label="Toggle table of contents"
        aria-expanded={isOpen}
        style={{['--progress' as never]: `${progress}`}}
      >
        <svg viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            strokeWidth="2"
            className="reading-progress-track"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            className="reading-progress-fill"
          />
        </svg>
        <span className="reading-progress-num">{rounded}</span>
      </button>
    </div>
  )
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([])
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const article = document.querySelector('article')
    if (!article) {
      return undefined
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
    if (headings.length === 0) {
      return undefined
    }
    document.body.setAttribute('data-has-toc', 'true')
    return () => {
      document.body.removeAttribute('data-has-toc')
    }
  }, [headings.length])

  if (headings.length === 0) {
    return null
  }

  return <FloatingTOC headings={headings} activeId={activeId} />
}
