import {useState} from 'react'

import {DownloadButton} from '@/components/offline/DownloadButton'
import {OfflineLink} from '@/components/offline/OfflineLink'

import * as styles from './MarpSlides.styles'

const MENU_VIEWPORT_MARGIN = 8

export interface ContextMenuActions {
  prev: () => void
  next: () => void
  first: () => void
  last: () => void
  goTo: (index: number) => void
  toggleHidden: () => void
  overview: () => void
  presenter: () => void
  fullscreen: () => void
  copyLink: () => void
  qr: () => void
  print: () => void
  toggleLaser: () => void
  toggleDrawing: () => void
  help: () => void
  home: () => void
}

interface MarpContextMenuProps {
  x: number
  y: number
  // Swiper 기준 현재 위치와 보이는 장 수
  position: number
  total: number
  slideCount: number
  multiple: boolean
  hiddenCount: number
  showHiddenSlides: boolean
  isLaserMode: boolean
  isDrawingMode: boolean
  offline: boolean
  slug: string
  postUrl?: string
  actions: ContextMenuActions
  onClose: () => void
}

export function MarpContextMenu({
  x,
  y,
  position,
  total,
  slideCount,
  multiple,
  hiddenCount,
  showHiddenSlides,
  isLaserMode,
  isDrawingMode,
  offline,
  slug,
  postUrl,
  actions,
  onClose,
}: MarpContextMenuProps) {
  const [goToInput, setGoToInput] = useState('')

  // 모든 항목은 동작 후 메뉴를 닫는다
  const run = (action: () => void) => () => {
    action()
    onClose()
  }
  const goTo = run(() => {
    const num = parseInt(goToInput, 10)
    if (num >= 1 && num <= slideCount) {
      actions.goTo(num - 1)
    }
  })

  return (
    <div
      className={styles.contextMenu}
      // 좁은 화면에서는 누른 자리에 그대로 두면 메뉴가 화면 밖으로 나간다
      ref={(el) => {
        if (!el) {
          return
        }
        const {width, height} = el.getBoundingClientRect()
        const left = Math.min(
          x,
          window.innerWidth - width - MENU_VIEWPORT_MARGIN,
        )
        const top = Math.min(
          y,
          window.innerHeight - height - MENU_VIEWPORT_MARGIN,
        )
        el.style.left = `${Math.max(MENU_VIEWPORT_MARGIN, left)}px`
        el.style.top = `${Math.max(MENU_VIEWPORT_MARGIN, top)}px`
      }}
      style={{top: y, left: x}}
      role="presentation"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.contextMenuHeader}>
        슬라이드 {position + 1} / {total}
      </div>
      <div className={styles.contextMenuDivider} />
      {multiple && (
        <>
          <button
            className={styles.contextMenuItem}
            onClick={run(actions.prev)}
            disabled={position === 0}
          >
            <span className={styles.contextMenuIcon}>←</span>
            이전 슬라이드
            <span className={styles.contextMenuShortcut}>←</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={run(actions.next)}
            disabled={position === total - 1}
          >
            <span className={styles.contextMenuIcon}>→</span>
            다음 슬라이드
            <span className={styles.contextMenuShortcut}>→</span>
          </button>
          <div className={styles.contextMenuDivider} />
          <button
            className={styles.contextMenuItem}
            onClick={run(actions.first)}
          >
            <span className={styles.contextMenuIcon}>⇤</span>첫 슬라이드
            <span className={styles.contextMenuShortcut}>Home</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={run(actions.last)}
          >
            <span className={styles.contextMenuIcon}>⇥</span>
            마지막 슬라이드
            <span className={styles.contextMenuShortcut}>End</span>
          </button>
          <div className={styles.contextMenuDivider} />
          <div className={styles.contextMenuGoTo}>
            <span>슬라이드 이동:</span>
            <input
              className={styles.contextMenuGoToInput}
              type="number"
              min={1}
              max={slideCount}
              value={goToInput}
              onChange={(e) => setGoToInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  goTo()
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder={`1-${slideCount}`}
            />
            <button className={styles.contextMenuGoToButton} onClick={goTo}>
              이동
            </button>
          </div>
          <div className={styles.contextMenuDivider} />
          <button
            className={styles.contextMenuItem}
            onClick={run(actions.overview)}
          >
            <span className={styles.contextMenuIcon}>▦</span>
            슬라이드 오버뷰
            <span className={styles.contextMenuShortcut}>G</span>
          </button>
          <div className={styles.contextMenuDivider} />
        </>
      )}
      {hiddenCount > 0 && (
        <button
          className={styles.contextMenuItem}
          onClick={run(actions.toggleHidden)}
        >
          <span className={styles.contextMenuIcon} aria-hidden="true">
            ◫
          </span>
          {showHiddenSlides ? '숨김 슬라이드 감추기' : '숨김 슬라이드 보기'}
          <span className={styles.contextMenuShortcut}>{hiddenCount}장</span>
        </button>
      )}
      <button
        className={styles.contextMenuItem}
        onClick={run(actions.presenter)}
      >
        <span className={styles.contextMenuIcon}>🎤</span>
        발표자 모드
        <span className={styles.contextMenuShortcut}>P</span>
      </button>
      <button
        className={styles.contextMenuItem}
        onClick={run(actions.fullscreen)}
      >
        <span className={styles.contextMenuIcon}>⛶</span>
        {document.fullscreenElement ? '전체화면 종료' : '전체화면'}
        <span className={styles.contextMenuShortcut}>F11</span>
      </button>
      <button
        className={styles.contextMenuItem}
        onClick={run(actions.copyLink)}
      >
        <span className={styles.contextMenuIcon}>🔗</span>
        현재 슬라이드 링크 복사
      </button>
      <button className={styles.contextMenuItem} onClick={run(actions.qr)}>
        <span className={styles.contextMenuIcon}>▦</span>
        QR 코드 표시
        <span className={styles.contextMenuShortcut}>Q</span>
      </button>
      <button className={styles.contextMenuItem} onClick={run(actions.print)}>
        <span className={styles.contextMenuIcon}>📄</span>
        PDF로 다운로드
      </button>
      <div className="offline-viewer-controls">
        {offline ? (
          <OfflineLink className="offline-button" href="/offline">
            ← Offline
          </OfflineLink>
        ) : (
          <DownloadButton slug={slug} />
        )}
      </div>
      {postUrl && (
        <button
          className={styles.contextMenuItem}
          onClick={run(() =>
            window.open(postUrl, '_blank', 'noopener,noreferrer'),
          )}
        >
          <span className={styles.contextMenuIcon}>📖</span>
          블로그 글로 읽기
        </button>
      )}
      <button
        className={styles.contextMenuItem}
        onClick={run(actions.toggleLaser)}
      >
        <span className={styles.contextMenuIcon}>•</span>
        레이저 포인터 {isLaserMode ? '끄기' : '켜기'}
        <span className={styles.contextMenuShortcut}>L</span>
      </button>
      <button
        className={styles.contextMenuItem}
        onClick={run(actions.toggleDrawing)}
      >
        <span className={styles.contextMenuIcon}>✎</span>
        드로잉 모드 {isDrawingMode ? '끄기' : '켜기'}
        <span className={styles.contextMenuShortcut}>D</span>
      </button>
      <button className={styles.contextMenuItem} onClick={run(actions.help)}>
        <span className={styles.contextMenuIcon}>?</span>
        단축키 도움말
        <span className={styles.contextMenuShortcut}>?</span>
      </button>
      <div className={styles.contextMenuDivider} />
      <button className={styles.contextMenuItem} onClick={actions.home}>
        <span className={styles.contextMenuIcon}>🏠</span>
        홈으로
      </button>
    </div>
  )
}
