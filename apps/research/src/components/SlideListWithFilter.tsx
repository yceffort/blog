'use client'

import Link from 'next/link'
import {useCallback, useMemo, useSyncExternalStore} from 'react'

import {SlidePreview} from './SlidePreview'

interface Slide {
  slug: string
  date: string
  tags: string[]
  description: string
  title: string
  published: boolean
  preview: {
    html: string
    css: string
    fonts: string[]
  }
}

interface Props {
  slides: Slide[]
}

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

function writeTagsToUrl(tags: string[]) {
  if (typeof window === 'undefined') {
    return
  }
  const url = new URL(window.location.href)
  if (tags.length === 0) {
    url.searchParams.delete('tag')
  } else {
    url.searchParams.set('tag', tags.join(','))
  }
  window.history.replaceState(null, '', url.toString())
}

function ResearchCard({slide}: {slide: Slide}) {
  const {slug, date, tags, title, preview, published} = slide

  return (
    <article className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/10 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-sky-500 dark:hover:shadow-sky-500/20">
      {!published && (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-bold uppercase text-white shadow">
          Draft
        </span>
      )}
      <Link href={`/slides/${slug}`} className="block">
        <SlidePreview
          html={preview.html}
          css={preview.css}
          fonts={preview.fonts}
        />
      </Link>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase text-blue-600 dark:bg-blue-900 dark:text-blue-300"
              >
                {tag}
              </span>
            ))}
          </div>
          <div>
            <h3 className="text-lg font-black leading-tight tracking-tight line-clamp-2">
              <Link
                href={`/slides/${slug}`}
                className="text-black decoration-4 hover:underline dark:text-white"
              >
                {title}
              </Link>
            </h3>
            <dl>
              <dt className="sr-only">Published on</dt>
              <dd className="text-sm font-bold leading-6 text-gray-600 dark:text-gray-400">
                <time dateTime={date}>{date}</time>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </article>
  )
}

function subscribeToHistory(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener('research:tag-change', onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener('research:tag-change', onChange)
  }
}

export function SlideListWithFilter({slides}: Props) {
  // URL ↔ state 동기화 (SSR-safe)
  const tagsKey = useSyncExternalStore(
    subscribeToHistory,
    () => readTagsFromUrl().join(','),
    () => '',
  )
  const selectedTags = useMemo(
    () => (tagsKey ? tagsKey.split(',').filter(Boolean) : []),
    [tagsKey],
  )

  const setSelectedTags = useCallback((next: string[]) => {
    writeTagsToUrl(next)
    window.dispatchEvent(new Event('research:tag-change'))
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

  const handleToggleTag = (tag: string) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag]
    setSelectedTags(next)
  }

  const handleClearTags = () => {
    setSelectedTags([])
  }

  return (
    <>
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-2 pt-4">
          <button
            type="button"
            onClick={handleClearTags}
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
              selectedTags.length === 0
                ? 'border-sky-500 bg-sky-500 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-sky-400 hover:text-sky-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-sky-500 dark:hover:text-sky-400'
            }`}
          >
            전체 ({slides.length})
          </button>
          {allTags.map(([tag, count]) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleTag(tag)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  active
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400'
                }`}
              >
                {tag} <span className="opacity-60">({count})</span>
              </button>
            )
          })}
          {selectedTags.length > 0 && (
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              {filteredSlides.length}건 표시 중
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
        {filteredSlides.map((slide) => (
          <ResearchCard key={slide.slug} slide={slide} />
        ))}
        {filteredSlides.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-500 dark:text-gray-400">
            선택한 태그에 해당하는 슬라이드가 없습니다.
          </div>
        )}
      </div>
    </>
  )
}
