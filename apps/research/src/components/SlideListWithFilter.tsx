'use client'

import Link from 'next/link'
import {useCallback, useMemo, useRef, useSyncExternalStore} from 'react'

import {SiteConfig} from '@/config'

import {SlidePreview} from './SlidePreview'

interface Slide {
  slug: string
  date: string | null
  tags: string[]
  description: string
  title: string
  published: boolean
  slideCount: number
  preview: {
    html: string
    cssIndex: number
    fonts: string[]
  }
}

interface Props {
  slides: Slide[]
  cssList: string[]
}

const PER_PAGE = SiteConfig.postsPerPage

function readTagsFromUrl(): string[] {
  if (typeof window === 'undefined') {
    return []
  }
  const tag = new URLSearchParams(window.location.search).get('tag')
  if (!tag) {
    return []
  }
  return tag
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

function readPageFromUrl(): number {
  if (typeof window === 'undefined') {
    return 1
  }
  const page = Number(new URLSearchParams(window.location.search).get('page'))
  return Number.isInteger(page) && page > 1 ? page : 1
}

function writeFilterToUrl(tags: string[], page: number) {
  if (typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  if (tags.length === 0) {
    url.searchParams.delete('tag')
  } else {
    url.searchParams.set('tag', tags.join(','))
  }
  if (page <= 1) {
    url.searchParams.delete('page')
  } else {
    url.searchParams.set('page', String(page))
  }
  window.history.replaceState(null, '', url.toString())
  window.dispatchEvent(new Event('research:filter-change'))
}

function ResearchCard({slide, css}: {slide: Slide; css: string}) {
  const {slug, date, tags, title, description, preview, published, slideCount} =
    slide
  const cardRef = useRef<HTMLElement>(null)

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = cardRef.current
    if (!el) {
      return
    }
    const rect = el.getBoundingClientRect()
    el.style.setProperty(
      '--mx',
      `${((e.clientX - rect.left) / rect.width) * 100}%`,
    )
    el.style.setProperty(
      '--my',
      `${((e.clientY - rect.top) / rect.height) * 100}%`,
    )
  }

  return (
    <article ref={cardRef} className="post-card" onPointerMove={onPointerMove}>
      <Link href={`/slides/${slug}`} aria-label={title} prefetch={false} />
      {!published && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow">
          Draft
        </span>
      )}
      <div className="thumb">
        <SlidePreview html={preview.html} css={css} fonts={preview.fonts} />
      </div>
      <div className="body">
        <div className="tag-row">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag-chip">
              #{tag}
            </span>
          ))}
        </div>
        <h3>{title}</h3>
        {description && <p className="desc">{description}</p>}
        <div className="meta">
          {date && (
            <>
              <time dateTime={date}>{date}</time>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>{slideCount} slides</span>
        </div>
      </div>
    </article>
  )
}

function subscribeToHistory(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener('research:filter-change', onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('research:filter-change', onChange)
  }
}

export function SlideListWithFilter({slides, cssList}: Props) {
  // URL ↔ state 동기화 (SSR-safe)
  const filterKey = useSyncExternalStore(
    subscribeToHistory,
    () => `${readTagsFromUrl().join(',')}|${readPageFromUrl()}`,
    () => '|1',
  )
  const [tagsKey, pageKey] = filterKey.split('|')
  const selectedTags = useMemo(
    () => (tagsKey ? tagsKey.split(',').filter(Boolean) : []),
    [tagsKey],
  )
  const rawPage = Number(pageKey) || 1

  const listTopRef = useRef<HTMLDivElement>(null)

  const setSelectedTags = useCallback((next: string[]) => {
    writeFilterToUrl(next, 1)
  }, [])

  const allTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const slide of slides) {
      for (const tag of slide.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return Array.from(counts.entries()).toSorted((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1]
      }
      // localeCompare는 서버/클라이언트 ICU 구현 차이로 hydration mismatch 발생
      if (a[0] < b[0]) {
        return -1
      }
      if (a[0] > b[0]) {
        return 1
      }
      return 0
    })
  }, [slides])

  const filteredSlides = useMemo(() => {
    if (selectedTags.length === 0) {
      return slides
    }
    return slides.filter((slide) =>
      selectedTags.some((tag) => slide.tags.includes(tag)),
    )
  }, [slides, selectedTags])

  const lastPage = Math.max(1, Math.ceil(filteredSlides.length / PER_PAGE))
  const page = Math.min(rawPage, lastPage)
  const pagedSlides = filteredSlides.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE,
  )

  const handleToggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag]
    setSelectedTags(next)
  }

  const handleClearTags = () => {
    setSelectedTags([])
  }

  const handlePageChange = (nextPage: number) => {
    writeFilterToUrl(selectedTags, nextPage)
    listTopRef.current?.scrollIntoView({block: 'start'})
  }

  return (
    <>
      <div ref={listTopRef} className="sec-head scroll-mt-20">
        <div>
          <span className="sec-count">
            {selectedTags.length > 0
              ? `${filteredSlides.length}/${slides.length} decks`
              : `${slides.length} decks`}
          </span>
          <h2>
            All <em>decks</em>
          </h2>
        </div>
        <div className="line" />
        <span className="hint">tap tag · filter</span>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <button
            type="button"
            onClick={handleClearTags}
            className="filter-chip"
            data-on={selectedTags.length === 0 ? 'true' : 'false'}
          >
            전체 <span className="count">({slides.length})</span>
          </button>
          {allTags.map(([tag, count]) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleToggleTag(tag)}
              className="filter-chip"
              data-on={selectedTags.includes(tag) ? 'true' : 'false'}
            >
              #{tag} <span className="count">({count})</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
        {pagedSlides.map((slide) => (
          <ResearchCard
            key={slide.slug}
            slide={slide}
            css={cssList[slide.preview.cssIndex] ?? ''}
          />
        ))}
        {filteredSlides.length === 0 && (
          <div className="col-span-full py-16 text-center text-sm text-[var(--ink-3)]">
            선택한 태그에 해당하는 슬라이드가 없습니다.
          </div>
        )}
      </div>

      {lastPage > 1 && (
        <nav className="pager" aria-label="pagination">
          <button
            type="button"
            className="pager-btn"
            disabled={page === 1}
            onClick={() => handlePageChange(page - 1)}
            aria-label="이전 페이지"
          >
            ←
          </button>
          {Array.from({length: lastPage}, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className="pager-btn"
              data-active={n === page ? 'true' : 'false'}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => n !== page && handlePageChange(n)}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            className="pager-btn"
            disabled={page === lastPage}
            onClick={() => handlePageChange(page + 1)}
            aria-label="다음 페이지"
          >
            →
          </button>
        </nav>
      )}
    </>
  )
}
