import {useMemo, useState} from 'react'

import * as styles from './MarpSlides.styles'

const focusOnMount = (el: HTMLInputElement | null) => el?.focus()

interface MarpSearchModalProps {
  html: string[]
  // 검색 대상에서 뺄 원본 슬라이드 번호(0부터)
  excluded: number[]
  onSelect: (index: number) => void
  onClose: () => void
}

export function MarpSearchModal({
  html,
  excluded,
  onSelect,
  onClose,
}: MarpSearchModalProps) {
  const [query, setQuery] = useState('')

  // 검색을 열 때만 슬라이드 본문을 파싱한다
  const slideTexts = useMemo(() => {
    const parser = new DOMParser()
    return html.map((h) => {
      const doc = parser.parseFromString(h, 'text/html')
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
    })
  }, [html])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return []
    }
    return slideTexts.flatMap((text, index) => {
      if (excluded.includes(index)) {
        return []
      }
      const pos = text.toLowerCase().indexOf(q)
      if (pos === -1) {
        return []
      }
      const start = Math.max(0, pos - 30)
      const end = Math.min(text.length, pos + q.length + 60)
      const snippet =
        (start > 0 ? '…' : '') +
        text.slice(start, end) +
        (end < text.length ? '…' : '')
      return [{index, snippet}]
    })
  }, [query, slideTexts, excluded])

  return (
    <div
      className={styles.searchOverlay}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <dialog
        open
        className={styles.searchDialog}
        aria-label="슬라이드 검색"
        aria-modal="true"
      >
        <input
          ref={focusOnMount}
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              onSelect(results[0].index)
            }
          }}
          placeholder="슬라이드 내용 검색…"
          aria-label="검색어"
        />
        <div className={styles.searchResults}>
          {query.trim() && results.length === 0 && (
            <div className={styles.searchEmpty}>결과 없음</div>
          )}
          {results.map((r) => (
            <button
              key={r.index}
              className={styles.searchResult}
              onClick={() => onSelect(r.index)}
            >
              <span className={styles.searchResultIndex}>{r.index + 1}</span>
              <span className={styles.searchResultSnippet}>{r.snippet}</span>
            </button>
          ))}
        </div>
        <div className={styles.searchHint}>
          {results.length > 0
            ? `${results.length}건 일치 · Enter로 첫 결과 이동 · ESC로 닫기`
            : '/ 또는 Cmd/Ctrl+F로 열기 · ESC로 닫기'}
        </div>
      </dialog>
    </div>
  )
}
