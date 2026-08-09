'use client'

import MiniSearch from 'minisearch'
import Link from 'next/link'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {ReactNode} from 'react'

import {useLocale} from '@/hooks/useLocale'
import {
  miniSearchOptions,
  searchOptions,
  type SearchDoc,
  type StoredDoc,
} from '@/utils/search'

const MAX_RESULTS = 20

type Result = StoredDoc & {terms: string[]}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// MiniSearch가 돌려준 매칭 용어(prefix·fuzzy 포함)를 텍스트에서 찾아 강조한다.
function highlight(text: string, terms: string[]): ReactNode {
  const cleaned = terms
    .filter(Boolean)
    .toSorted((a, b) => b.length - a.length)
    .map(escapeRegExp)
  if (cleaned.length === 0) {
    return text
  }
  const re = new RegExp(`(${cleaned.join('|')})`, 'gi')
  return text
    .split(re)
    .map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))
}

export default function SiteSearch() {
  const {locale, pathPrefix} = useLocale()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadIndex = useCallback(async () => {
    if (index || loading) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        locale === 'en' ? '/api/search-index/en' : '/api/search-index',
      )
      const data = await res.json()
      if (data.index) {
        setIndex(MiniSearch.loadJS<SearchDoc>(data.index, miniSearchOptions))
      }
    } catch {
      // 인덱스 로드 실패 시 검색 결과가 비어있는 상태로 유지된다.
    } finally {
      setLoading(false)
    }
  }, [index, loading, locale])

  const handleOpen = useCallback(() => {
    setOpen(true)
    loadIndex()
  }, [loadIndex])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        loadIndex()
      } else if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loadIndex, handleClose])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  const trimmed = query.normalize('NFC').trim()
  const results = useMemo<Result[]>(() => {
    if (!trimmed || !index) {
      return []
    }
    return index
      .search(trimmed, searchOptions)
      .slice(0, MAX_RESULTS) as unknown as Result[]
  }, [trimmed, index])

  return (
    <>
      <button
        type="button"
        className="icon-btn"
        aria-label={locale === 'en' ? 'Search' : '검색'}
        onClick={handleOpen}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>

      {open && (
        <div
          className="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={locale === 'en' ? 'Search posts' : '글 검색'}
          onClick={handleClose}
        >
          <div className="search-panel" onClick={(e) => e.stopPropagation()}>
            <div className="search-input-row">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                className="search-input"
                placeholder={locale === 'en' ? 'Search posts…' : '글 검색…'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="button"
                className="search-esc"
                onClick={handleClose}
                aria-label={locale === 'en' ? 'Close' : '닫기'}
              >
                esc
              </button>
            </div>

            <div className="search-results">
              {loading && (
                <p className="search-hint">
                  {locale === 'en' ? 'Loading…' : '불러오는 중…'}
                </p>
              )}
              {!loading && trimmed.length > 0 && results.length === 0 && (
                <p className="search-hint">
                  {locale === 'en' ? 'No results' : '검색 결과가 없습니다'}
                </p>
              )}
              {results.map((item) => (
                <Link
                  key={item.slug}
                  href={`${pathPrefix}/${item.slug}`}
                  className="search-result"
                  onClick={handleClose}
                  prefetch={false}
                >
                  <span className="search-result-title">
                    {highlight(item.title, item.terms)}
                  </span>
                  {item.snippet && (
                    <span className="search-result-desc">
                      {highlight(item.snippet, item.terms)}
                    </span>
                  )}
                  <span className="search-result-meta">
                    {item.date}
                    {item.tags.length > 0 &&
                      ` · ${item.tags
                        .slice(0, 3)
                        .map((t) => `#${t}`)
                        .join(' ')}`}
                  </span>
                </Link>
              ))}
            </div>

            {locale !== 'en' && (
              <div className="search-foot">
                <Link
                  href="/archive"
                  className="search-archive-link"
                  onClick={handleClose}
                >
                  연도별로 둘러보기 →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
