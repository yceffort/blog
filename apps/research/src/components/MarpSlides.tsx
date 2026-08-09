'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {MouseEvent as ReactMouseEvent} from 'react'
import type {Swiper as SwiperClass} from 'swiper'
import 'swiper/css'
import 'swiper/css/effect-creative'
import 'swiper/css/effect-fade'
import {EffectCreative, EffectFade, Virtual} from 'swiper/modules'
import {Swiper, SwiperSlide} from 'swiper/react'

import {useBroadcastChannel} from '@/hooks/useBroadcastChannel'
import {useDrawing} from '@/hooks/useDrawing'
import {useLaserPointer} from '@/hooks/useLaserPointer'

import {Marp} from './Marp'
import {MarpHelpModal} from './MarpHelpModal'
import {MarpQrModal} from './MarpQrModal'
import {MarpSearchModal} from './MarpSearchModal'
import {readTransition} from './MarpSlides.constants'
import type {ContextMenuState, TransitionType} from './MarpSlides.constants'

import styles from './MarpSlides.module.scss'

interface MarpSlidesProps {
  dataHtml: string
  dataCss: string
  dataFonts: string
  slug: string
}

export function MarpSlides({
  dataHtml,
  dataCss,
  dataFonts,
  slug,
}: MarpSlidesProps) {
  // JSON 파싱에 에러 처리 추가 (memoized)
  const html = useMemo(() => {
    try {
      return JSON.parse(dataHtml) as string[]
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse HTML data:', error)
      return []
    }
  }, [dataHtml])

  const fonts = useMemo(() => {
    try {
      return JSON.parse(dataFonts) as string[]
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to parse fonts data:', error)
      return []
    }
  }, [dataFonts])

  const css = dataCss

  // 초기 해시값에서 activeIndex 설정
  const getInitialIndex = useCallback((length: number) => {
    if (typeof window === 'undefined') {
      return 0
    }

    const hash = window.location.hash
    if (hash.startsWith('#')) {
      const pageNum = parseInt(hash.slice(1), 10)
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= length) {
        return pageNum - 1
      }
    }
    return 0
  }, [])

  // 상태 관리 — SSR과 동일한 초기값(0)으로 시작하여 hydration mismatch 방지
  const [activeIndex, setActiveIndex] = useState(0)
  const [isBottomHovered, setIsBottomHovered] = useState(false)
  const [isOverviewOpen, setIsOverviewOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
  })
  const [goToSlideInput, setGoToSlideInput] = useState('')
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [transition, setTransition] = useState<TransitionType>('slide')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLaserMode, setIsLaserMode] = useState(false)
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const swiperRef = useRef<SwiperClass | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeIndexRef = useRef(activeIndex)
  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const laserRef = useLaserPointer(isLaserMode)
  const {
    canvasRef,
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    handleClearCanvas,
  } = useDrawing(isDrawingMode, activeIndex)

  const {sendSlideChange} = useBroadcastChannel(`marp-slides-${slug}`, {
    onSlideChange: (index) => {
      if (index !== activeIndexRef.current) {
        swiperRef.current?.slideTo(index)
      }
    },
    onSyncRequest: () => activeIndexRef.current,
  })

  // memoized values
  const multiple = useMemo(() => html.length > 1, [html.length])

  // 슬라이드별 본문 텍스트 (검색용)
  const slideTexts = useMemo(() => {
    if (typeof DOMParser === 'undefined') {
      return [] as string[]
    }
    const parser = new DOMParser()
    return html.map((h) => {
      const doc = parser.parseFromString(h, 'text/html')
      return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
    })
  }, [html])

  // 검색 결과
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      return [] as {index: number; snippet: string}[]
    }
    return slideTexts
      .map((text, index) => {
        const lower = text.toLowerCase()
        const pos = lower.indexOf(q)
        if (pos === -1) {
          return null
        }
        const start = Math.max(0, pos - 30)
        const end = Math.min(text.length, pos + q.length + 60)
        const snippet =
          (start > 0 ? '…' : '') +
          text.slice(start, end) +
          (end < text.length ? '…' : '')
        return {index, snippet}
      })
      .filter((v): v is {index: number; snippet: string} => v !== null)
  }, [searchQuery, slideTexts])

  // 클라이언트에서만 실행되는 초기화 - hash에서 초기 슬라이드 동기화
  useEffect(() => {
    const initialIndex = getInitialIndex(html.length)
    if (initialIndex > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(initialIndex)
      swiperRef.current?.slideTo(initialIndex, 0)
    }

    setTransition(readTransition())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // TweaksPanel에서 슬라이드 전환 효과 변경 시 동기화
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<TransitionType>).detail
      if (detail) {
        setTransition(detail)
      }
    }
    window.addEventListener('research:transition', handler)
    return () => window.removeEventListener('research:transition', handler)
  }, [])

  // 슬라이드 변경 핸들러 (memoized)
  const handleActiveIndexChange = useCallback(
    (instance: SwiperClass) => {
      const newIndex = instance.activeIndex
      setActiveIndex(newIndex)
      sendSlideChange(newIndex, 'audience')
      if (typeof window !== 'undefined') {
        const newHash = `#${newIndex + 1}`
        if (window.location.hash !== newHash) {
          window.location.hash = newHash
        }
      }
    },
    [sendSlideChange],
  )

  // Swiper 초기화 핸들러 (memoized)
  const handleSwiper = useCallback((instance: SwiperClass) => {
    swiperRef.current = instance
  }, [])

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 요소에 포커스가 있으면 단축키 무시
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      // 도움말 토글 (? 키)
      if (e.key === '?') {
        setIsHelpOpen((prev) => !prev)
        return
      }

      // 검색 열기 (/ 또는 Cmd/Ctrl+F)
      if (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'f')) {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      // 레이저 포인터 토글 (L 키)
      if (e.key === 'l' || e.key === 'L') {
        setIsLaserMode((prev) => !prev)
        return
      }

      // 드로잉 모드 토글 (D 키)
      if (e.key === 'd' || e.key === 'D') {
        setIsDrawingMode((prev) => !prev)
        return
      }

      // QR 코드 토글 (Q 키)
      if (e.key === 'q' || e.key === 'Q') {
        setQrUrl((prev) =>
          prev
            ? null
            : `${window.location.origin}${window.location.pathname}#${activeIndexRef.current + 1}`,
        )
        return
      }

      // 오버뷰 토글 (G 키)
      if (e.key === 'g' || e.key === 'G') {
        if (multiple) {
          setIsOverviewOpen((prev) => !prev)
        }
        return
      }

      // 발표자 모드 열기 (P 키)
      if (e.key === 'p' || e.key === 'P') {
        window.open(
          `/slides/${slug}/presenter`,
          'presenter',
          'width=1200,height=800',
        )
        return
      }

      // ESC로 도움말/QR/검색/오버뷰 닫기
      if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false)
          setSearchQuery('')
          return
        }
        if (qrUrl) {
          setQrUrl(null)
          return
        }
        if (isHelpOpen) {
          setIsHelpOpen(false)
          return
        }
        if (isOverviewOpen) {
          setIsOverviewOpen(false)
          return
        }
      }

      // 오버뷰가 열려있으면 슬라이드 네비게이션 비활성화
      if (isOverviewOpen || !multiple) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          swiperRef.current?.slidePrev()
          break
        case 'ArrowRight':
          swiperRef.current?.slideNext()
          break
        case 'Home':
          swiperRef.current?.slideTo(0)
          break
        case 'End':
          swiperRef.current?.slideTo(html.length - 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    multiple,
    html.length,
    isOverviewOpen,
    isHelpOpen,
    qrUrl,
    isSearchOpen,
    slug,
  ])

  // 검색 모달 열릴 때 input에 포커스
  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus()
    }
  }, [isSearchOpen])

  // 휠 네비게이션
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!multiple || contextMenu.visible) {
        return
      }

      // 디바운스 처리
      if (wheelTimeoutRef.current) {
        return
      }

      if (e.deltaY > 0) {
        swiperRef.current?.slideNext()
      } else if (e.deltaY < 0) {
        swiperRef.current?.slidePrev()
      }

      wheelTimeoutRef.current = setTimeout(() => {
        wheelTimeoutRef.current = null
      }, 300)
    },
    [multiple, contextMenu.visible],
  )

  // 클릭 네비게이션 (좌우/상하 10% 영역) (memoized)
  const handleSlideClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const xPos = e.clientX - rect.left
      const yPos = e.clientY - rect.top
      const xPercent = (xPos / rect.width) * 100
      const yPercent = (yPos / rect.height) * 100

      // 상단 10% 영역 클릭 - 첫 슬라이드로
      if (yPercent <= 10) {
        if (multiple && swiperRef.current) {
          swiperRef.current.slideTo(0)
        }
      }
      // 하단 10% 영역 클릭 - 루트 페이지로
      else if (yPercent >= 90) {
        if (typeof window !== 'undefined') {
          window.location.href = '/'
        }
      }
      // 좌측 10% 영역 클릭 - 이전 슬라이드
      else if (xPercent <= 10 && multiple && swiperRef.current) {
        swiperRef.current.slidePrev()
      }
      // 우측 10% 영역 클릭 - 다음 슬라이드
      else if (xPercent >= 90 && multiple && swiperRef.current) {
        swiperRef.current.slideNext()
      }
      // 중앙 영역은 아무 동작 없음
    },
    [multiple],
  )

  // 해시 변경 감지
  useEffect(() => {
    if (!multiple) {
      return
    }

    const handleHashChange = () => {
      const hash = window.location.hash
      if (!hash.startsWith('#')) {
        return
      }

      const pageNum = parseInt(hash.slice(1), 10)
      if (isNaN(pageNum) || pageNum < 1 || pageNum > html.length) {
        return
      }

      const newIndex = pageNum - 1
      if (newIndex !== activeIndexRef.current) {
        swiperRef.current?.slideTo(newIndex)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [multiple, html.length])

  // 하단 호버 핸들러 (memoized)
  const handleBottomEnter = useCallback(() => setIsBottomHovered(true), [])
  const handleBottomLeave = useCallback(() => setIsBottomHovered(false), [])

  // 오버뷰 썸네일 클릭 핸들러
  const handleOverviewSlideClick = useCallback((index: number) => {
    swiperRef.current?.slideTo(index)
    setIsOverviewOpen(false)
  }, [])

  // 오버뷰 오버레이 클릭 핸들러 (배경 클릭 시 닫기)
  const handleOverviewOverlayClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setIsOverviewOpen(false)
      }
    },
    [],
  )

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
      })
    },
    [],
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({...prev, visible: false}))
    setGoToSlideInput('')
  }, [])

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        closeContextMenu()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu.visible, closeContextMenu])

  // 컨텍스트 메뉴 액션들
  const handlePrevSlide = useCallback(() => {
    swiperRef.current?.slidePrev()
    closeContextMenu()
  }, [closeContextMenu])

  const handleNextSlide = useCallback(() => {
    swiperRef.current?.slideNext()
    closeContextMenu()
  }, [closeContextMenu])

  const handleFirstSlide = useCallback(() => {
    swiperRef.current?.slideTo(0)
    closeContextMenu()
  }, [closeContextMenu])

  const handleLastSlide = useCallback(() => {
    swiperRef.current?.slideTo(html.length - 1)
    closeContextMenu()
  }, [html.length, closeContextMenu])

  const handleGoToSlide = useCallback(
    (num: number) => {
      if (num >= 1 && num <= html.length) {
        swiperRef.current?.slideTo(num - 1)
      }
      closeContextMenu()
    },
    [html.length, closeContextMenu],
  )

  const handleOpenOverview = useCallback(() => {
    setIsOverviewOpen(true)
    closeContextMenu()
  }, [closeContextMenu])

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
    closeContextMenu()
  }, [closeContextMenu])

  const handleGoHome = useCallback(() => {
    window.location.href = '/'
  }, [])

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#${activeIndex + 1}`
    navigator.clipboard.writeText(url)
    closeContextMenu()
  }, [activeIndex, closeContextMenu])

  const handleOpenPresenter = useCallback(() => {
    window.open(
      `/slides/${slug}/presenter`,
      'presenter',
      'width=1200,height=800',
    )
    closeContextMenu()
  }, [slug, closeContextMenu])

  const handleOpenHelp = useCallback(() => {
    setIsHelpOpen(true)
    closeContextMenu()
  }, [closeContextMenu])

  const handleOpenQr = useCallback(() => {
    setQrUrl(
      `${window.location.origin}${window.location.pathname}#${activeIndex + 1}`,
    )
    closeContextMenu()
  }, [activeIndex, closeContextMenu])

  const handleQrOverlayClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setQrUrl(null)
      }
    },
    [],
  )

  const handleCopyQrUrl = useCallback(() => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl)
    }
  }, [qrUrl])

  const handlePrint = useCallback(() => {
    setIsPrinting(true)
    closeContextMenu()
  }, [closeContextMenu])

  useEffect(() => {
    if (!isPrinting) {
      return
    }
    const handleAfterPrint = () => setIsPrinting(false)
    window.addEventListener('afterprint', handleAfterPrint)
    // 인쇄 전용 슬라이드들이 마운트되도록 한 프레임 대기 후 인쇄
    const timer = window.setTimeout(() => {
      window.print()
    }, 250)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [isPrinting])

  const handleHelpOverlayClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setIsHelpOpen(false)
      }
    },
    [],
  )

  const handleSearchOverlayClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setIsSearchOpen(false)
        setSearchQuery('')
      }
    },
    [],
  )

  const handleSearchSelect = useCallback((index: number) => {
    swiperRef.current?.slideTo(index)
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [])

  // Marp 렌더링 데이터 (memoized)
  const marpRenderData = useMemo(() => ({html, css, fonts}), [html, css, fonts])

  // 에러 상태 처리
  if (html.length === 0) {
    return (
      <div className={styles.errorMessage}>슬라이드를 로드할 수 없습니다.</div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.marpSlides} ${multiple ? styles.multiple : ''} ${isPrinting ? styles.printing : ''} ${isLaserMode ? styles.laserMode : ''}`}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
      <Swiper
        key={transition}
        modules={[Virtual, EffectFade, EffectCreative]}
        virtual={{enabled: multiple, addSlidesBefore: 1, addSlidesAfter: 1}}
        enabled={multiple}
        allowTouchMove={multiple}
        speed={transition === 'none' ? 0 : 350}
        effect={
          transition === 'fade'
            ? 'fade'
            : transition === 'zoom'
              ? 'creative'
              : 'slide'
        }
        fadeEffect={{crossFade: true}}
        creativeEffect={{
          prev: {opacity: 0, scale: 0.7, translate: [0, 0, -200]},
          next: {opacity: 0, scale: 1.3, translate: [0, 0, 200]},
        }}
        onActiveIndexChange={handleActiveIndexChange}
        onSwiper={handleSwiper}
        // 접근성 개선
        a11y={{
          enabled: true,
          prevSlideMessage: '이전 슬라이드',
          nextSlideMessage: '다음 슬라이드',
          firstSlideMessage: '첫 번째 슬라이드',
          lastSlideMessage: '마지막 슬라이드',
          paginationBulletMessage: '슬라이드 {{index}}로 이동',
        }}
      >
        {html.map((_, i) => (
          <SwiperSlide key={i} virtualIndex={i}>
            <div
              onClick={handleSlideClick}
              className={styles.marpSlide}
              role={multiple ? 'button' : undefined}
              tabIndex={multiple ? 0 : undefined}
              aria-label={
                multiple ? `슬라이드 ${i + 1}/${html.length}` : undefined
              }
            >
              <Marp border rendered={marpRenderData} page={i + 1} />

              {/* 클릭 가능 영역 시각적 표시 (hover 시) */}
              {multiple && (
                <>
                  {/* 좌측 영역 */}
                  <div
                    className={`${styles.clickArea} ${styles.clickAreaLeft}`}
                    aria-hidden="true"
                  />
                  {/* 우측 영역 */}
                  <div
                    className={`${styles.clickArea} ${styles.clickAreaRight}`}
                    aria-hidden="true"
                  />
                </>
              )}

              {/* 상단 영역 - 첫 슬라이드로 */}
              <div
                className={`${styles.clickArea} ${styles.clickAreaTop}`}
                aria-hidden="true"
              />

              {/* 하단 영역 - 루트 페이지로 */}
              <div
                className={`${styles.clickArea} ${styles.clickAreaBottom}`}
                aria-hidden="true"
                onMouseEnter={handleBottomEnter}
                onMouseLeave={handleBottomLeave}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 진행률 바 */}
      {multiple && (
        <div className={styles.progressBar}>
          <div
            className={styles.progressBarFill}
            style={{width: `${((activeIndex + 1) / html.length) * 100}%`}}
          />
        </div>
      )}

      {/* 페이지 인디케이터 */}
      {multiple && (
        <div
          className={`${styles.pageIndicator} ${isBottomHovered ? styles.visible : ''}`}
        >
          {activeIndex + 1} / {html.length}
        </div>
      )}

      {/* 슬라이드 오버뷰 */}
      {multiple && isOverviewOpen && (
        <div
          className={styles.overview}
          onClick={handleOverviewOverlayClick}
          role="dialog"
          aria-label="슬라이드 오버뷰"
        >
          <div className={styles.overviewGrid}>
            {html.map((_, i) => (
              <button
                key={i}
                className={`${styles.overviewItem} ${i === activeIndex ? styles.active : ''}`}
                onClick={() => handleOverviewSlideClick(i)}
                aria-label={`슬라이드 ${i + 1}로 이동`}
                aria-current={i === activeIndex ? 'true' : undefined}
              >
                <div className={styles.overviewThumbnail}>
                  <Marp rendered={marpRenderData} page={i + 1} />
                </div>
                <span className={styles.overviewNumber}>{i + 1}</span>
              </button>
            ))}
          </div>
          <div className={styles.overviewHint}>ESC 또는 G 키로 닫기</div>
        </div>
      )}

      {/* 레이저 포인터 */}
      {isLaserMode && (
        <div ref={laserRef} className={styles.laserDot} aria-hidden="true" />
      )}

      {/* 드로잉 캔버스 + 툴바 */}
      {isDrawingMode && (
        <>
          <canvas
            ref={canvasRef}
            className={styles.drawingCanvas}
            onPointerDown={handleDrawStart}
            onPointerMove={handleDrawMove}
            onPointerUp={handleDrawEnd}
            onPointerCancel={handleDrawEnd}
          />
          <div
            className={styles.drawToolbar}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawToolGroup}>
              {(['pen', 'highlighter', 'eraser'] as const).map((t) => (
                <button
                  key={t}
                  className={styles.drawToolBtn}
                  data-on={drawTool === t}
                  onClick={() => setDrawTool(t)}
                  aria-label={t}
                  title={t}
                >
                  {t === 'pen' ? '✎' : t === 'highlighter' ? '◐' : '⌫'}
                </button>
              ))}
            </div>
            <div className={styles.drawToolGroup}>
              {[
                '#ef4444',
                '#3b82f6',
                '#facc15',
                '#22c55e',
                '#000000',
                '#ffffff',
              ].map((c) => (
                <button
                  key={c}
                  className={styles.drawColorBtn}
                  data-on={drawColor === c}
                  style={{background: c}}
                  onClick={() => {
                    setDrawColor(c)
                    if (drawTool === 'eraser') {
                      setDrawTool('pen')
                    }
                  }}
                  aria-label={`color ${c}`}
                  title={c}
                />
              ))}
            </div>
            <button
              className={styles.drawClearBtn}
              onClick={handleClearCanvas}
              title="전체 지우기"
            >
              clear
            </button>
            <button
              className={styles.drawCloseBtn}
              onClick={() => setIsDrawingMode(false)}
              title="드로잉 종료"
            >
              ×
            </button>
          </div>
        </>
      )}

      {/* 인쇄(PDF) 전용 컨테이너 - 모든 슬라이드를 페이지 단위로 렌더링 */}
      {isPrinting && (
        <div className={styles.printContainer} aria-hidden="true">
          {html.map((_, i) => (
            <div key={i} className={styles.printSlide}>
              <Marp border={false} rendered={marpRenderData} page={i + 1} />
            </div>
          ))}
        </div>
      )}

      {/* 슬라이드 검색 모달 */}
      {isSearchOpen && (
        <MarpSearchModal
          inputRef={searchInputRef}
          query={searchQuery}
          onQueryChange={(value) => setSearchQuery(value)}
          results={searchResults}
          onSelect={handleSearchSelect}
          onOverlayClick={handleSearchOverlayClick}
        />
      )}

      {/* QR 코드 모달 */}
      {qrUrl && (
        <MarpQrModal
          qrUrl={qrUrl}
          onOverlayClick={handleQrOverlayClick}
          onCopy={handleCopyQrUrl}
        />
      )}

      {/* 단축키 도움말 모달 */}
      {isHelpOpen && (
        <MarpHelpModal
          onClose={() => setIsHelpOpen(false)}
          onOverlayClick={handleHelpOverlayClick}
        />
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu.visible && (
        <div
          className={styles.contextMenu}
          style={{top: contextMenu.y, left: contextMenu.x}}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.contextMenuHeader}>
            슬라이드 {activeIndex + 1} / {html.length}
          </div>
          <div className={styles.contextMenuDivider} />
          {multiple && (
            <>
              <button
                className={styles.contextMenuItem}
                onClick={handlePrevSlide}
                disabled={activeIndex === 0}
              >
                <span className={styles.contextMenuIcon}>←</span>
                이전 슬라이드
                <span className={styles.contextMenuShortcut}>←</span>
              </button>
              <button
                className={styles.contextMenuItem}
                onClick={handleNextSlide}
                disabled={activeIndex === html.length - 1}
              >
                <span className={styles.contextMenuIcon}>→</span>
                다음 슬라이드
                <span className={styles.contextMenuShortcut}>→</span>
              </button>
              <div className={styles.contextMenuDivider} />
              <button
                className={styles.contextMenuItem}
                onClick={handleFirstSlide}
              >
                <span className={styles.contextMenuIcon}>⇤</span>첫 슬라이드
                <span className={styles.contextMenuShortcut}>Home</span>
              </button>
              <button
                className={styles.contextMenuItem}
                onClick={handleLastSlide}
              >
                <span className={styles.contextMenuIcon}>⇥</span>
                마지막 슬라이드
                <span className={styles.contextMenuShortcut}>End</span>
              </button>
              <div className={styles.contextMenuDivider} />
              <div className={styles.contextMenuGoTo}>
                <span>슬라이드 이동:</span>
                <input
                  type="number"
                  min={1}
                  max={html.length}
                  value={goToSlideInput}
                  onChange={(e) => setGoToSlideInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoToSlide(parseInt(goToSlideInput, 10))
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={`1-${html.length}`}
                />
                <button
                  onClick={() => handleGoToSlide(parseInt(goToSlideInput, 10))}
                >
                  이동
                </button>
              </div>
              <div className={styles.contextMenuDivider} />
              <button
                className={styles.contextMenuItem}
                onClick={handleOpenOverview}
              >
                <span className={styles.contextMenuIcon}>▦</span>
                슬라이드 오버뷰
                <span className={styles.contextMenuShortcut}>G</span>
              </button>
              <div className={styles.contextMenuDivider} />
            </>
          )}
          <button
            className={styles.contextMenuItem}
            onClick={handleOpenPresenter}
          >
            <span className={styles.contextMenuIcon}>🎤</span>
            발표자 모드
            <span className={styles.contextMenuShortcut}>P</span>
          </button>
          <button className={styles.contextMenuItem} onClick={handleFullscreen}>
            <span className={styles.contextMenuIcon}>⛶</span>
            {document.fullscreenElement ? '전체화면 종료' : '전체화면'}
            <span className={styles.contextMenuShortcut}>F11</span>
          </button>
          <button className={styles.contextMenuItem} onClick={handleCopyLink}>
            <span className={styles.contextMenuIcon}>🔗</span>
            현재 슬라이드 링크 복사
          </button>
          <button className={styles.contextMenuItem} onClick={handleOpenQr}>
            <span className={styles.contextMenuIcon}>▦</span>
            QR 코드 표시
            <span className={styles.contextMenuShortcut}>Q</span>
          </button>
          <button className={styles.contextMenuItem} onClick={handlePrint}>
            <span className={styles.contextMenuIcon}>📄</span>
            PDF로 다운로드
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setIsLaserMode((prev) => !prev)
              closeContextMenu()
            }}
          >
            <span className={styles.contextMenuIcon}>•</span>
            레이저 포인터 {isLaserMode ? '끄기' : '켜기'}
            <span className={styles.contextMenuShortcut}>L</span>
          </button>
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setIsDrawingMode((prev) => !prev)
              closeContextMenu()
            }}
          >
            <span className={styles.contextMenuIcon}>✎</span>
            드로잉 모드 {isDrawingMode ? '끄기' : '켜기'}
            <span className={styles.contextMenuShortcut}>D</span>
          </button>
          <button className={styles.contextMenuItem} onClick={handleOpenHelp}>
            <span className={styles.contextMenuIcon}>?</span>
            단축키 도움말
            <span className={styles.contextMenuShortcut}>?</span>
          </button>
          <div className={styles.contextMenuDivider} />
          <button className={styles.contextMenuItem} onClick={handleGoHome}>
            <span className={styles.contextMenuIcon}>🏠</span>
            홈으로
          </button>
        </div>
      )}
    </div>
  )
}
