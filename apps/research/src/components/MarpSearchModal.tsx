import type {MouseEvent as ReactMouseEvent, RefObject} from 'react'

import styles from './MarpSlides.module.scss'

interface SearchResult {
  index: number
  snippet: string
}

interface MarpSearchModalProps {
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  onQueryChange: (value: string) => void
  results: SearchResult[]
  onSelect: (index: number) => void
  onOverlayClick: (e: ReactMouseEvent<HTMLDivElement>) => void
}

export function MarpSearchModal({
  inputRef,
  query,
  onQueryChange,
  results,
  onSelect,
  onOverlayClick,
}: MarpSearchModalProps) {
  return (
    <div
      className={styles.searchOverlay}
      role="presentation"
      onClick={onOverlayClick}
    >
      <dialog
        open
        className={styles.searchDialog}
        aria-label="슬라이드 검색"
        aria-modal="true"
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
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
