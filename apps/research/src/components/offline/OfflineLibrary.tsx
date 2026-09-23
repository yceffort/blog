'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import {MarpSlides} from '@/components/MarpSlides'
import {PresenterView} from '@/components/PresenterView'
import {
  deleteDeck,
  formatBytes,
  getOfflineState,
  getServerOfflineState,
  offlineHref,
  subscribeOffline,
} from '@/lib/offline/client'
import {getSavedDeck} from '@/lib/offline/database'
import {getPosition, putPosition} from '@/lib/offline/positions'
import type {SavedDeck} from '@/lib/offline/types'

import {DownloadButton} from './DownloadButton'
import {OfflineLink} from './OfflineLink'

function subscribeLocation(listener: () => void) {
  window.addEventListener('popstate', listener)
  return () => window.removeEventListener('popstate', listener)
}

export function OfflineLibrary() {
  const state = useSyncExternalStore(
    subscribeOffline,
    getOfflineState,
    getServerOfflineState,
  )
  const pathname = useSyncExternalStore(
    subscribeLocation,
    () => window.location.pathname,
    () => '/offline',
  )
  const selection = useMemo(() => {
    const match = pathname.match(/^\/offline\/([^/]+)(\/presenter)?\/?$/)
    if (!match) return null
    try {
      return {slug: decodeURIComponent(match[1]), presenter: !!match[2]}
    } catch {
      return null
    }
  }, [pathname])
  const [deck, setDeck] = useState<SavedDeck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selection) return undefined
    const {slug} = selection
    let disposed = false
    void (async () => {
      const saved = await getSavedDeck(slug)
      if (!saved || !(await caches.has(saved.assetCache))) {
        throw new Error(
          '이 자료는 저장되어 있지 않습니다. 연결 후 오프라인 저장을 눌러 주세요.',
        )
      }
      const cache = await caches.open(saved.assetCache)
      const resources = await Promise.all(
        saved.assets.map((url) => cache.match(url)),
      )
      if (resources.some((resource) => !resource)) {
        throw new Error(
          '저장된 파일 일부가 없어 자료를 다시 다운로드해야 합니다.',
        )
      }
      if (!window.location.hash) {
        const page = getPosition(slug)
        if (page && page <= saved.html.length)
          window.history.replaceState(
            null,
            '',
            `${window.location.href}#${page}`,
          )
      }
      if (!disposed) {
        document.title = `${saved.title} · 저장한 자료`
        setDeck(saved)
      }
    })()
      .catch((reason: unknown) => {
        if (!disposed)
          setError(
            reason instanceof Error
              ? reason.message
              : '저장한 자료를 열 수 없습니다.',
          )
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })
    return () => {
      disposed = true
    }
  }, [selection])

  const savePosition = useCallback(
    (page: number) => {
      if (deck) {
        putPosition(deck.slug, page)
      }
    },
    [deck],
  )

  if (deck) {
    return selection?.presenter ? (
      <PresenterView
        dataHtml={JSON.stringify(deck.html)}
        dataCss={deck.css}
        dataFonts={JSON.stringify(deck.fonts)}
        dataNotes={JSON.stringify(deck.notes)}
        slug={deck.slug}
      />
    ) : (
      <MarpSlides
        dataHtml={JSON.stringify(deck.html)}
        dataCss={deck.css}
        dataFonts={JSON.stringify(deck.fonts)}
        slug={deck.slug}
        postUrl={deck.post}
        defaultTransition={deck.transition}
        onPageChange={savePosition}
        offline
      />
    )
  }

  return (
    <main className="offline-library">
      <nav className="offline-library-nav" aria-label="보관함 탐색">
        <OfflineLink href="/">← 전체 슬라이드</OfflineLink>
        {selection && (
          <OfflineLink href="/offline">저장한 자료 목록</OfflineLink>
        )}
      </nav>
      <p className="offline-eyebrow">YOUR OFFLINE LIBRARY</p>
      <h1>저장한 자료</h1>
      <p className="offline-description">
        슬라이드 전환 효과, 발표자 노트, 타이머까지 인터넷 없이 그대로 사용할 수
        있습니다.
      </p>
      {error && (
        <p className="offline-error" role="alert">
          {error}
        </p>
      )}
      {(selection && loading) || !state.ready ? (
        <output>저장한 자료를 확인하고 있습니다…</output>
      ) : !state.supported ? (
        <p>이 브라우저에서는 오프라인 저장소를 사용할 수 없습니다.</p>
      ) : state.decks.length === 0 ? (
        <div className="offline-empty">
          <h2>아직 저장한 자료가 없습니다</h2>
          <p>슬라이드 목록에서 필요한 자료의 ‘오프라인 저장’을 눌러 주세요.</p>
        </div>
      ) : (
        <>
          <output className="offline-update-status">
            {state.checkingUpdates
              ? '변경사항을 확인하고 새 버전을 자동 저장하고 있습니다…'
              : (state.automaticUpdateError ??
                '온라인에 연결되면 변경사항을 자동으로 저장합니다.')}
            {state.lastCheckedAt && !state.checkingUpdates && (
              <span>
                {' '}
                마지막 확인{' '}
                {new Date(state.lastCheckedAt).toLocaleTimeString('ko-KR')}
              </span>
            )}
          </output>
          <p className="offline-summary">
            {state.decks.length}개 자료 ·{' '}
            {formatBytes(
              state.decks.reduce((total, item) => total + item.bytes, 0),
            )}
            <span>공통 뷰어 용량 제외</span>
          </p>
          <ul className="offline-decks">
            {state.decks.map((item) => (
              <li key={item.slug} className="offline-deck">
                <h2>
                  <a href={offlineHref(item.slug)}>{item.title}</a>
                </h2>
                {item.description && <p>{item.description}</p>}
                <p className="offline-deck-meta">
                  {item.html.length}장 · {formatBytes(item.bytes)} ·{' '}
                  {new Date(item.savedAt).toLocaleDateString('ko-KR')} 저장
                </p>
                <div className="offline-actions">
                  <a
                    className="offline-button offline-button-primary"
                    href={offlineHref(item.slug)}
                  >
                    슬라이드 열기
                  </a>
                  <a
                    className="offline-button"
                    href={offlineHref(item.slug, true)}
                  >
                    발표자 모드
                  </a>
                  <DownloadButton slug={item.slug} update />
                  <button
                    className="offline-button offline-button-quiet"
                    type="button"
                    disabled={!!state.progress[item.slug]}
                    onClick={() => {
                      void deleteDeck(item.slug).catch(() =>
                        setError(
                          '자료를 삭제하지 못했습니다. 다시 시도해 주세요.',
                        ),
                      )
                    }}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="offline-footnote">
        저장본은 이 브라우저에 보관됩니다. 외부 링크와 온라인 데모는 인터넷
        연결이 필요합니다.
      </p>
    </main>
  )
}
