'use client'

import * as stylex from '@stylexjs/stylex'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import type {Swiper as SwiperClass} from 'swiper'
import 'swiper/css'
import 'swiper/css/effect-creative'
import 'swiper/css/effect-fade'
import {EffectCreative, EffectFade, Virtual} from 'swiper/modules'
import {Swiper, SwiperSlide} from 'swiper/react'

import {useBroadcastChannel} from '@/hooks/useBroadcastChannel'
import {useDrawing} from '@/hooks/useDrawing'
import {useLaserPointer} from '@/hooks/useLaserPointer'
import {getSlideGroups} from '@/lib/slideNavigation'

import {Marp} from './Marp'
import {MarpHelpModal} from './MarpHelpModal'
import {MarpQrModal} from './MarpQrModal'
import {MarpSearchModal} from './MarpSearchModal'
import {readTransition} from './MarpSlides.constants'
import type {ContextMenuState, TransitionType} from './MarpSlides.constants'
import * as styles from './MarpSlides.styles'
import {styles as sx} from './MarpSlides.styles'

// 터치 롱프레스로 컨텍스트 메뉴를 여는 기준. 이동 허용치는 스와이프와 구분하기 위한 값이다
const LONG_PRESS_MS = 500
const LONG_PRESS_MOVE_TOLERANCE = 10
const MENU_VIEWPORT_MARGIN = 8

interface MarpSlidesProps {
  dataHtml: string
  dataCss: string
  dataFonts: string
  slug: string
  postUrl?: string
  // 덱 frontmatter의 transition. 지정되면 뷰어 설정(cookie)보다 우선한다
  defaultTransition?: TransitionType
}

export function MarpSlides({
  dataHtml,
  dataCss,
  dataFonts,
  slug,
  postUrl,
  defaultTransition,
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
  const slideGroups = useMemo(() => getSlideGroups(html), [html])

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
  const [{activeIndex, showHiddenSlides}, setNavigation] = useState(() => ({
    activeIndex: slideGroups.visible[0] ?? 0,
    showHiddenSlides: slideGroups.visible.length === 0,
  }))
  const slideIndices = showHiddenSlides ? slideGroups.all : slideGroups.visible
  const activePosition = Math.max(0, slideIndices.indexOf(activeIndex))
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
  // 터치 롱프레스도 우클릭과 같은 메뉴를 연다
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressStartRef = useRef<{x: number; y: number} | null>(null)
  // 롱프레스로 연 직후 따라오는 click은 메뉴를 바로 닫으므로 다음 pointerdown까지 무시한다
  const longPressFiredRef = useRef(false)
  const activeIndexRef = useRef(activeIndex)
  const showHiddenSlidesRef = useRef(showHiddenSlides)
  const lastVisibleIndexRef = useRef(slideGroups.visible[0] ?? 0)
  useEffect(() => {
    activeIndexRef.current = activeIndex
    showHiddenSlidesRef.current = showHiddenSlides
  }, [activeIndex, showHiddenSlides])

  const applyNavigation = useCallback(
    (index: number, includeHidden = showHiddenSlidesRef.current) => {
      if (!Number.isInteger(index) || index < 0 || index >= html.length) {
        return null
      }
      const isHidden = slideGroups.hidden.includes(index)
      const nextShowHidden = includeHidden || isHidden
      if (
        index === activeIndexRef.current &&
        nextShowHidden === showHiddenSlidesRef.current
      ) {
        return null
      }
      const next = {activeIndex: index, showHiddenSlides: nextShowHidden}
      activeIndexRef.current = index
      showHiddenSlidesRef.current = nextShowHidden
      if (!isHidden) {
        lastVisibleIndexRef.current = index
      }
      setNavigation(next)
      const newHash = `#${index + 1}`
      if (window.location.hash !== newHash) {
        window.location.hash = newHash
      }
      window.gtag?.('event', 'slide_view', {
        slide_number: index + 1,
        page_path: window.location.pathname,
      })
      return next
    },
    [html.length, slideGroups.hidden],
  )

  const laserRef = useLaserPointer(isLaserMode)
  const {
    canvasRef,
    textInputRef,
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    handleClearCanvas,
    textPos,
    commitText,
    cancelText,
  } = useDrawing(isDrawingMode, activeIndex)

  const {sendSlideChange} = useBroadcastChannel(`marp-slides-${slug}`, {
    onSlideChange: applyNavigation,
    onSyncRequest: () => ({
      index: activeIndexRef.current,
      showHiddenSlides: showHiddenSlidesRef.current,
    }),
  })

  const navigateTo = useCallback(
    (index: number, includeHidden = showHiddenSlidesRef.current) => {
      const next = applyNavigation(index, includeHidden)
      if (next) {
        sendSlideChange(next.activeIndex, 'audience', next.showHiddenSlides)
      }
    },
    [applyNavigation, sendSlideChange],
  )

  // 원본 슬라이드 번호와 숨김 장을 제외한 Swiper 위치를 구분해 동기화한다.
  useEffect(() => {
    const swiper = swiperRef.current
    if (swiper && !swiper.destroyed && swiper.activeIndex !== activePosition) {
      swiper.slideTo(activePosition)
    }
  }, [activePosition, showHiddenSlides])

  // memoized values
  const multiple = slideIndices.length > 1

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
        if (!showHiddenSlides && slideGroups.hidden.includes(index)) {
          return null
        }
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
  }, [searchQuery, slideTexts, showHiddenSlides, slideGroups.hidden])

  // 클라이언트에서만 실행되는 초기화 - hash에서 초기 슬라이드 동기화
  useEffect(() => {
    const initialIndex = getInitialIndex(html.length)
    if (initialIndex > 0) {
      navigateTo(initialIndex)
    }

    setTransition(defaultTransition ?? readTransition())
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
      const newIndex = slideIndices[instance.activeIndex]
      if (newIndex !== undefined) {
        navigateTo(newIndex)
      }
    },
    [slideIndices, navigateTo],
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

      // 물리 키 기준(e.code)으로 비교해 한영 전환/Caps Lock 상태와 무관하게 동작

      // 도움말 토글 (? 키)
      if (e.key === '?' || (e.code === 'Slash' && e.shiftKey)) {
        setIsHelpOpen((prev) => !prev)
        return
      }

      // 검색 열기 (/ 또는 Cmd/Ctrl+F)
      if (
        (e.code === 'Slash' && !e.shiftKey) ||
        ((e.metaKey || e.ctrlKey) && e.code === 'KeyF')
      ) {
        e.preventDefault()
        setIsSearchOpen(true)
        return
      }

      // 레이저 포인터 토글 (L 키)
      if (e.code === 'KeyL') {
        setIsLaserMode((prev) => !prev)
        return
      }

      // 드로잉 모드 토글 (D 키)
      if (e.code === 'KeyD') {
        setIsDrawingMode((prev) => !prev)
        return
      }

      // QR 코드 토글 (Q 키)
      if (e.code === 'KeyQ') {
        setQrUrl((prev) =>
          prev
            ? null
            : `${window.location.origin}${window.location.pathname}#${activeIndexRef.current + 1}`,
        )
        return
      }

      // 오버뷰 토글 (G 키)
      if (e.code === 'KeyG') {
        if (multiple) {
          setIsOverviewOpen((prev) => !prev)
        }
        return
      }

      // 발표자 모드 열기 (P 키)
      if (e.code === 'KeyP') {
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
      if (
        isOverviewOpen ||
        isSearchOpen ||
        isHelpOpen ||
        qrUrl ||
        contextMenu.visible ||
        !multiple
      ) {
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
          swiperRef.current?.slideTo(slideIndices.length - 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    multiple,
    slideIndices.length,
    isOverviewOpen,
    isHelpOpen,
    qrUrl,
    isSearchOpen,
    contextMenu.visible,
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
      if (
        !multiple ||
        contextMenu.visible ||
        isOverviewOpen ||
        isSearchOpen ||
        isHelpOpen ||
        qrUrl
      ) {
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
    [
      multiple,
      contextMenu.visible,
      isOverviewOpen,
      isSearchOpen,
      isHelpOpen,
      qrUrl,
    ],
  )

  // 클릭 네비게이션 (좌우/상하 10% 영역) (memoized)
  const handleSlideClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      // Shadow DOM 안의 링크 클릭은 슬라이드 이동 영역 클릭으로 처리하지 않는다.
      if (
        e.nativeEvent
          .composedPath()
          .some((node) => node instanceof Element && node.matches('a[href]'))
      ) {
        return
      }

      // 롱프레스로 메뉴를 연 손가락의 click이다. 이동 동작으로 이어지면 안 된다
      if (longPressFiredRef.current) {
        return
      }

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
        navigateTo(newIndex)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [html.length, navigateTo])

  // 하단 호버 핸들러 (memoized)
  const handleBottomEnter = useCallback(() => setIsBottomHovered(true), [])
  const handleBottomLeave = useCallback(() => setIsBottomHovered(false), [])

  // 오버뷰 썸네일 클릭 핸들러
  const handleOverviewSlideClick = useCallback(
    (index: number) => {
      navigateTo(index)
      setIsOverviewOpen(false)
    },
    [navigateTo],
  )

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

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    longPressStartRef.current = null
  }, [])

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      longPressFiredRef.current = false
      cancelLongPress()

      // 슬라이드 위에서만 연다. 모달, 드로잉 캔버스, 메뉴 자신은 Swiper 밖에 있다
      if (
        e.pointerType === 'mouse' ||
        !(e.target as HTMLElement).closest('.swiper')
      ) {
        return
      }

      const {clientX, clientY} = e
      longPressStartRef.current = {x: clientX, y: clientY}
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null
        longPressStartRef.current = null
        longPressFiredRef.current = true
        setContextMenu({visible: true, x: clientX, y: clientY})
      }, LONG_PRESS_MS)
    },
    [cancelLongPress],
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = longPressStartRef.current
      if (!start) {
        return
      }
      if (
        Math.abs(e.clientX - start.x) > LONG_PRESS_MOVE_TOLERANCE ||
        Math.abs(e.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE
      ) {
        cancelLongPress()
      }
    },
    [cancelLongPress],
  )

  useEffect(() => cancelLongPress, [cancelLongPress])

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({...prev, visible: false}))
    setGoToSlideInput('')
  }, [])

  // 컨텍스트 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible && !longPressFiredRef.current) {
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
    swiperRef.current?.slideTo(slideIndices.length - 1)
    closeContextMenu()
  }, [slideIndices.length, closeContextMenu])

  const handleGoToSlide = useCallback(
    (num: number) => {
      if (num >= 1 && num <= html.length) {
        navigateTo(num - 1)
      }
      closeContextMenu()
    },
    [html.length, closeContextMenu, navigateTo],
  )

  const handleToggleHiddenSlides = useCallback(() => {
    if (showHiddenSlides) {
      navigateTo(lastVisibleIndexRef.current, false)
    } else if (slideGroups.hidden.length > 0) {
      navigateTo(slideGroups.hidden[0], true)
    }
    closeContextMenu()
  }, [showHiddenSlides, slideGroups.hidden, navigateTo, closeContextMenu])

  const handleOpenOverview = useCallback(() => {
    setIsOverviewOpen(true)
    closeContextMenu()
  }, [closeContextMenu])

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        void document.exitFullscreen()
      } else {
        void containerRef.current.requestFullscreen()
      }
    }
    closeContextMenu()
  }, [closeContextMenu])

  const handleGoHome = useCallback(() => {
    window.location.href = '/'
  }, [])

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#${activeIndex + 1}`
    void navigator.clipboard.writeText(url)
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
      void navigator.clipboard.writeText(qrUrl)
    }
  }, [qrUrl])

  const handlePrint = useCallback(() => {
    setIsPrinting(true)
    closeContextMenu()
  }, [closeContextMenu])

  useEffect(() => {
    if (!isPrinting) {
      return undefined
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

  const handleSearchSelect = useCallback(
    (index: number) => {
      navigateTo(index)
      setIsSearchOpen(false)
      setSearchQuery('')
    },
    [navigateTo],
  )

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
      className={`marp-slides ${
        stylex.props(
          sx.marpSlides,
          multiple && sx.multiple,
          isLaserMode && sx.laserMode,
        ).className ?? ''
      }`}
      data-transition={transition}
      data-laser={isLaserMode}
      data-printing={isPrinting}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
    >
      <Swiper
        key={`${transition}-${showHiddenSlides}`}
        // 전환 효과 변경으로 재생성되어도 해시에서 복원한 현재 위치를 유지한다.
        initialSlide={activePosition}
        modules={[Virtual, EffectFade, EffectCreative]}
        virtual={{enabled: multiple, addSlidesBefore: 1, addSlidesAfter: 1}}
        enabled={multiple}
        allowTouchMove={multiple}
        speed={transition === 'none' ? 0 : transition === 'glide' ? 600 : 350}
        effect={
          transition === 'fade'
            ? 'fade'
            : transition === 'zoom' || transition === 'glide'
              ? 'creative'
              : 'slide'
        }
        fadeEffect={{crossFade: true}}
        creativeEffect={
          transition === 'glide'
            ? {
                // 나가는 장은 살짝 물러나며 흐려지고, 들어오는 장이 그 위로 미끄러져 덮는다
                prev: {opacity: 0.35, scale: 0.97, translate: ['-20%', 0, 0]},
                next: {translate: ['100%', 0, 0]},
              }
            : {
                prev: {opacity: 0, scale: 0.7, translate: [0, 0, -200]},
                next: {opacity: 0, scale: 1.3, translate: [0, 0, 200]},
              }
        }
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
        {slideIndices.map((i, position) => (
          <SwiperSlide key={i} virtualIndex={position}>
            <div
              className={styles.marpSlide}
              {...(multiple
                ? {
                    onClick: handleSlideClick,
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `슬라이드 ${i + 1}${slideGroups.hidden.includes(i) ? ' (숨김)' : ''}`,
                  }
                : {})}
            >
              <Marp border rendered={marpRenderData} page={i + 1} />

              {/* 클릭 가능 영역 시각적 표시 (hover 시) */}
              {multiple && (
                <>
                  {/* 좌측 영역 */}
                  <div className={styles.clickAreaLeft} aria-hidden="true" />
                  {/* 우측 영역 */}
                  <div className={styles.clickAreaRight} aria-hidden="true" />
                </>
              )}

              {/* 상단 영역 - 첫 슬라이드로 */}
              <div className={styles.clickAreaTop} aria-hidden="true" />

              {/* 하단 영역 - 루트 페이지로 */}
              <div
                className={styles.clickAreaBottom}
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
            style={{
              width: `${((activePosition + 1) / slideIndices.length) * 100}%`,
            }}
          />
        </div>
      )}

      {/* 페이지 인디케이터 */}
      {multiple && (
        <div
          className={
            isBottomHovered ? styles.pageIndicatorVisible : styles.pageIndicator
          }
        >
          {activePosition + 1} / {slideIndices.length}
        </div>
      )}

      {/* 슬라이드 오버뷰 */}
      {multiple && isOverviewOpen && (
        <div
          className={styles.overview}
          role="presentation"
          onClick={handleOverviewOverlayClick}
        >
          <dialog
            open
            className={styles.overviewGrid}
            aria-label="슬라이드 오버뷰"
          >
            {slideIndices.map((i) => (
              <button
                key={i}
                className={
                  i === activeIndex
                    ? styles.overviewItemActive
                    : styles.overviewItem
                }
                onClick={() => handleOverviewSlideClick(i)}
                aria-label={`슬라이드 ${i + 1}로 이동`}
                aria-current={i === activeIndex ? 'true' : undefined}
              >
                <div className={styles.overviewThumbnail}>
                  <Marp
                    rendered={marpRenderData}
                    page={i + 1}
                    className={styles.overviewThumbnailInner}
                  />
                </div>
                <span className={styles.overviewNumber}>
                  {i + 1}
                  {slideGroups.hidden.includes(i) ? ' · 숨김' : ''}
                </span>
              </button>
            ))}
          </dialog>
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
          {textPos && (
            <input
              className={styles.drawTextInput}
              style={{left: textPos.x, top: textPos.y, color: drawColor}}
              ref={(el) => {
                textInputRef.current = el
                el?.focus()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
                  cancelText()
                }
              }}
              // 한글 IME 조합 중 Enter 는 keydown 시점에 isComposing 이라 무시된다.
              // keyup 은 조합이 끝난 뒤라 마지막 글자까지 담긴 값을 커밋할 수 있다
              onKeyUp={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  commitText(e.currentTarget.value)
                }
              }}
              onBlur={(e) => commitText(e.currentTarget.value)}
            />
          )}
          <div
            className={styles.drawToolbar}
            role="presentation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawToolGroup}>
              {(['pen', 'highlighter', 'eraser', 'text'] as const).map((t) => (
                <button
                  key={t}
                  className={
                    drawTool === t ? styles.drawToolBtnOn : styles.drawToolBtn
                  }
                  onClick={() => setDrawTool(t)}
                  aria-label={t}
                  title={t}
                >
                  {t === 'pen'
                    ? '✎'
                    : t === 'highlighter'
                      ? '◐'
                      : t === 'eraser'
                        ? '⌫'
                        : 'T'}
                </button>
              ))}
            </div>
            <div className={styles.drawToolGroupLast}>
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
                  className={
                    drawColor === c
                      ? styles.drawColorBtnOn
                      : styles.drawColorBtn
                  }
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
        <div
          className={`marp-print-container ${styles.printContainer}`}
          aria-hidden="true"
        >
          {html.map((_, i) => (
            <div key={i} className="marp-print-slide">
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
          // 좁은 화면에서는 누른 자리에 그대로 두면 메뉴가 화면 밖으로 나간다
          ref={(el) => {
            if (!el) {
              return
            }
            const {width, height} = el.getBoundingClientRect()
            const left = Math.min(
              contextMenu.x,
              window.innerWidth - width - MENU_VIEWPORT_MARGIN,
            )
            const top = Math.min(
              contextMenu.y,
              window.innerHeight - height - MENU_VIEWPORT_MARGIN,
            )
            el.style.left = `${Math.max(MENU_VIEWPORT_MARGIN, left)}px`
            el.style.top = `${Math.max(MENU_VIEWPORT_MARGIN, top)}px`
          }}
          style={{top: contextMenu.y, left: contextMenu.x}}
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.contextMenuHeader}>
            슬라이드 {activePosition + 1} / {slideIndices.length}
          </div>
          <div className={styles.contextMenuDivider} />
          {multiple && (
            <>
              <button
                className={styles.contextMenuItem}
                onClick={handlePrevSlide}
                disabled={activePosition === 0}
              >
                <span className={styles.contextMenuIcon}>←</span>
                이전 슬라이드
                <span className={styles.contextMenuShortcut}>←</span>
              </button>
              <button
                className={styles.contextMenuItem}
                onClick={handleNextSlide}
                disabled={activePosition === slideIndices.length - 1}
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
                  className={styles.contextMenuGoToInput}
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
                  className={styles.contextMenuGoToButton}
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
          {slideGroups.hidden.length > 0 && (
            <button
              className={styles.contextMenuItem}
              onClick={handleToggleHiddenSlides}
            >
              <span className={styles.contextMenuIcon} aria-hidden="true">
                ◫
              </span>
              {showHiddenSlides ? '숨김 슬라이드 감추기' : '숨김 슬라이드 보기'}
              <span className={styles.contextMenuShortcut}>
                {slideGroups.hidden.length}장
              </span>
            </button>
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
          {postUrl && (
            <button
              className={styles.contextMenuItem}
              onClick={() => {
                window.open(postUrl, '_blank', 'noopener,noreferrer')
                closeContextMenu()
              }}
            >
              <span className={styles.contextMenuIcon}>📖</span>
              블로그 글로 읽기
            </button>
          )}
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
