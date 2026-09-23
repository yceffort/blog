'use client'

import {useSyncExternalStore} from 'react'

import {
  cancelDownload,
  downloadDeck,
  getOfflineState,
  getServerOfflineState,
  subscribeOffline,
} from '@/lib/offline/client'

export function DownloadButton({
  slug,
  className,
  update = false,
}: {
  slug: string
  className?: string
  update?: boolean
}) {
  const state = useSyncExternalStore(
    subscribeOffline,
    getOfflineState,
    getServerOfflineState,
  )
  const saved = state.decks.some((deck) => deck.slug === slug)
  const progress = state.progress[slug]
  const error = state.errors[slug]
  const label = progress
    ? `${progress.label}${progress.total ? ` ${Math.round((progress.completed / progress.total) * 100)}%` : '…'}`
    : saved
      ? update
        ? '업데이트'
        : '저장됨 · 다시 저장'
      : '↓ 오프라인 저장'
  return (
    <div className="offline-download">
      <button
        type="button"
        className={className ?? 'offline-button'}
        disabled={!state.ready || !state.supported || !!progress}
        onClick={() => {
          void downloadDeck(slug)
        }}
        aria-label={`${slug} ${saved ? '오프라인 저장본 업데이트' : '오프라인 저장'}`}
      >
        {process.env.NODE_ENV !== 'production'
          ? '오프라인 저장 안내'
          : state.ready && !state.supported
            ? '오프라인 저장 미지원'
            : label}
      </button>
      {progress && (
        <button
          type="button"
          className="offline-button offline-button-quiet"
          onClick={() => cancelDownload(slug)}
        >
          취소
        </button>
      )}
      <output className="offline-status">
        {error ?? (progress ? '완료될 때까지 이 화면을 열어 두세요.' : '')}
      </output>
    </div>
  )
}
