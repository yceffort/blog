'use client'

import {useEffect, useRef, useState, type ReactNode} from 'react'

// 글 오른쪽 아래의 플로팅 목차, 읽기 진행률, 맨 위로, 공유 버튼. 스타일은 앱의 StyleX가
// 컴파일해야 하므로 앱이 classNames로 넘긴다.
export interface FloatingTocClassNames {
  root: string
  panel: string
  header: string
  title: string
  close: string
  list: string
  ul: string
  link: string
  // 제목 단계별로 link 대신 쓸 클래스 (news는 h2를 절 제목처럼 그린다)
  linkByLevel?: Partial<Record<number, string>>
  scrollTop: string
  dial: string
  dialSvg: string
  dialTrack: string
  dialFill: string
  dialNum: string
  toast: string
  share: string
}

export interface FloatingTocLabels {
  title: string
  close: string
  scrollTop: string
  toggle: string
  share: string
  copied: string
}

interface FloatingTocProps {
  // 제목을 찾을 본문 컨테이너와 그 안의 제목 선택자 (예: 'article', 'h2, h3, h4')
  rootSelector: string
  headingSelector: string
  // GA share 이벤트의 content_type
  shareContentType: string
  classNames: FloatingTocClassNames
  labels: FloatingTocLabels
  // 진행률 다이얼과 공유 버튼 사이에 넣을 앱 고유 버튼
  children?: ReactNode
}

interface TocItem {
  el: HTMLElement
  text: string
  level: number
}

const SHARE_FEEDBACK_MS = 2000

function handleScrollTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function trackShare(method: 'web_share' | 'copy', contentType: string) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'share', {
      method,
      content_type: contentType,
      item_id: window.location.pathname,
    })
  }
}

function TocList({
  headings,
  active,
  classNames,
  onItemClick,
  itemRefs,
}: {
  headings: TocItem[]
  active: HTMLElement | null
  classNames: FloatingTocClassNames
  onItemClick: () => void
  itemRefs: React.MutableRefObject<Map<HTMLElement, HTMLLIElement>>
}) {
  return (
    <ul className={classNames.ul}>
      {headings.map((heading, index) => (
        <li
          key={heading.el.id || index}
          ref={(el) => {
            if (el) {
              itemRefs.current.set(heading.el, el)
            }
          }}
          style={{
            paddingLeft: `${(heading.level - 2) * 12}px`,
          }}
        >
          <a
            // 마크다운 렌더러가 id를 달지 않는 앱도 있어 이동은 요소를 직접 스크롤한다
            href={heading.el.id ? `#${heading.el.id}` : '#'}
            data-active={active === heading.el ? 'true' : 'false'}
            onClick={(e) => {
              e.preventDefault()
              heading.el.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              })
              onItemClick()
            }}
            className={
              classNames.linkByLevel?.[heading.level] ?? classNames.link
            }
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  )
}

function FloatingTocPanel({
  headings,
  active,
  shareContentType,
  classNames,
  labels,
  children,
}: Omit<FloatingTocProps, 'rootSelector' | 'headingSelector'> & {
  headings: TocItem[]
  active: HTMLElement | null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<HTMLElement, HTMLLIElement>>(new Map())
  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const p = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      setProgress(Math.min(100, Math.max(0, p)))
      setShowScrollTop(scrollTop > 50)
    }
    window.addEventListener('scroll', update, {
      passive: true,
    })
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
    if (!isOpen || !active || !scrollContainerRef.current) {
      return
    }
    const activeItem = itemRefs.current.get(active)
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
  }, [isOpen, active])
  useEffect(
    () => () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current)
      }
    },
    [],
  )
  const handleShare = async () => {
    const url = window.location.href
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: document.title,
          url,
        })
        trackShare('web_share', shareContentType)
        return
      } catch (error) {
        // 사용자가 공유 시트를 닫은 것이면 여기서 끝내고,
        // 브라우저가 공유를 거부한 것이면 복사로 넘어간다
        if ((error as Error).name === 'AbortError') {
          return
        }
      }
    }
    await navigator.clipboard.writeText(url)
    trackShare('copy', shareContentType)
    setCopied(true)
    if (copyTimer.current) {
      clearTimeout(copyTimer.current)
    }
    copyTimer.current = setTimeout(() => setCopied(false), SHARE_FEEDBACK_MS)
  }
  const rounded = Math.round(progress)
  return (
    <div ref={panelRef} className={classNames.root}>
      <div
        ref={scrollContainerRef}
        className={classNames.panel}
        data-open={isOpen ? 'true' : 'false'}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className={classNames.header}>
          <h2 className={classNames.title}>{labels.title}</h2>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={labels.close}
            className={classNames.close}
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
        <div className={classNames.list}>
          <TocList
            headings={headings}
            active={active}
            classNames={classNames}
            onItemClick={() => setIsOpen(false)}
            itemRefs={itemRefs}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleScrollTop}
        className={classNames.scrollTop}
        data-show={showScrollTop ? 'true' : 'false'}
        aria-label={labels.scrollTop}
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
        className={classNames.dial}
        data-visible="true"
        aria-label={labels.toggle}
        aria-expanded={isOpen}
        style={{
          ['--progress' as never]: `${progress}`,
        }}
      >
        <svg viewBox="0 0 36 36" className={classNames.dialSvg}>
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            strokeWidth="2"
            className={classNames.dialTrack}
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            className={classNames.dialFill}
          />
        </svg>
        <span className={classNames.dialNum}>{rounded}</span>
      </button>

      {children}

      <output
        className={classNames.toast}
        data-show={copied ? 'true' : 'false'}
      >
        {labels.copied}
      </output>

      <button
        type="button"
        onClick={handleShare}
        className={classNames.share}
        aria-label={labels.share}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4" />
          <path d="m15.4 6.5-6.8 4" />
        </svg>
      </button>
    </div>
  )
}

export function FloatingToc({
  rootSelector,
  headingSelector,
  ...panelProps
}: FloatingTocProps) {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [active, setActive] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const root = document.querySelector(rootSelector)
    if (!root) {
      return undefined
    }
    const elements = Array.from(
      root.querySelectorAll<HTMLElement>(headingSelector),
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeadings(
      elements.map((el) => ({
        el,
        text: el.textContent || '',
        level: parseInt(el.tagName[1]),
      })),
    )
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActive(entry.target as HTMLElement)
          }
        })
      },
      {
        rootMargin: '-80px 0px -80% 0px',
      },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [rootSelector, headingSelector])
  // 앱의 다른 플로팅 버튼(blog의 ScrollTop)이 목차가 있을 때 비켜서도록 알린다
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
  return (
    <FloatingTocPanel headings={headings} active={active} {...panelProps} />
  )
}
