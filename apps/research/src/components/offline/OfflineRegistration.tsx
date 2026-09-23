'use client'

import {useEffect, useSyncExternalStore} from 'react'

import {
  refreshOfflineState,
  registerOfflineWorker,
  supportsOffline,
  watchOfflineChanges,
  dismissOfflineNotice,
  getOfflineState,
  getServerOfflineState,
  subscribeOffline,
  cancelDownload,
  cleanUnusedDeckCaches,
} from '@/lib/offline/client'

import {OfflineLink} from './OfflineLink'

export function OfflineRegistration() {
  const state = useSyncExternalStore(
    subscribeOffline,
    getOfflineState,
    getServerOfflineState,
  )
  useEffect(() => {
    void refreshOfflineState()
    if (process.env.NODE_ENV === 'production' && supportsOffline()) {
      void registerOfflineWorker()
        .then(() => cleanUnusedDeckCaches())
        .catch(() => {})
    }
    return watchOfflineChanges()
  }, [])
  const active = Object.entries(state.progress).filter(
    ([, progress]) => !!progress,
  )
  if (!active.length && !state.notice) return null
  return (
    <aside className="offline-toast" aria-label="오프라인 저장 상태">
      <output>
        {active.length
          ? active.map(([slug, progress]) => (
              <span key={slug}>
                {progress?.label}
                {progress?.total
                  ? ` ${Math.round((progress.completed / progress.total) * 100)}%`
                  : '…'}
                <button
                  type="button"
                  onClick={() => cancelDownload(slug)}
                  aria-label={`${slug} 다운로드 취소`}
                >
                  취소
                </button>
              </span>
            ))
          : state.notice}
      </output>
      {active.length ? (
        <p>완료될 때까지 이 화면을 열어 두세요.</p>
      ) : (
        <div className="offline-actions">
          <OfflineLink href="/offline">저장한 자료 →</OfflineLink>
          <button
            type="button"
            onClick={dismissOfflineNotice}
            aria-label="저장 알림 닫기"
          >
            닫기
          </button>
        </div>
      )}
    </aside>
  )
}
