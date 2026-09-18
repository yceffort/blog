'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'

import {useBroadcastChannel} from '@/hooks/useBroadcastChannel'
import {useTimer} from '@/hooks/useTimer'
import {getSlideGroups} from '@/lib/slideNavigation'

import {Marp} from './Marp'
import * as styles from './PresenterView.styles'

interface PresenterViewProps {
  dataHtml: string
  dataCss: string
  dataFonts: string
  dataNotes: string
  slug: string
}

export function PresenterView({
  dataHtml,
  dataCss,
  dataFonts,
  dataNotes,
  slug,
}: PresenterViewProps) {
  const html = useMemo(() => {
    try {
      return JSON.parse(dataHtml) as string[]
    } catch {
      return []
    }
  }, [dataHtml])

  const fonts = useMemo(() => {
    try {
      return JSON.parse(dataFonts) as string[]
    } catch {
      return []
    }
  }, [dataFonts])

  const notes = useMemo(() => {
    try {
      return JSON.parse(dataNotes) as string[]
    } catch {
      return []
    }
  }, [dataNotes])

  const css = dataCss
  const slideGroups = useMemo(() => getSlideGroups(html), [html])
  const [{activeIndex, showHiddenSlides}, setNavigation] = useState(() => ({
    activeIndex: slideGroups.visible[0] ?? 0,
    showHiddenSlides: slideGroups.visible.length === 0,
  }))
  const slideIndices = showHiddenSlides ? slideGroups.all : slideGroups.visible
  const activePosition = slideIndices.indexOf(activeIndex)
  const nextIndex = slideIndices[activePosition + 1]
  const {elapsedTime, isRunning, toggle, reset} = useTimer()

  const {sendSlideChange, requestSync} = useBroadcastChannel(
    `marp-slides-${slug}`,
    {
      onSlideChange: (index, includeHidden) => {
        if (Number.isInteger(index) && index >= 0 && index < html.length) {
          setNavigation({
            activeIndex: index,
            showHiddenSlides:
              includeHidden || slideGroups.hidden.includes(index),
          })
        }
      },
    },
  )

  useEffect(() => {
    requestSync()
  }, [requestSync])

  const goToPrev = useCallback(() => {
    const newIndex = slideIndices[activePosition - 1]
    if (newIndex !== undefined) {
      setNavigation({activeIndex: newIndex, showHiddenSlides})
      sendSlideChange(newIndex, 'presenter', showHiddenSlides)
    }
  }, [activePosition, slideIndices, showHiddenSlides, sendSlideChange])

  const goToNext = useCallback(() => {
    if (nextIndex !== undefined) {
      setNavigation({activeIndex: nextIndex, showHiddenSlides})
      sendSlideChange(nextIndex, 'presenter', showHiddenSlides)
    }
  }, [nextIndex, showHiddenSlides, sendSlideChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev()
          break
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          goToNext()
          break
        case 'Home':
          if (slideIndices.length > 0) {
            setNavigation({activeIndex: slideIndices[0], showHiddenSlides})
            sendSlideChange(slideIndices[0], 'presenter', showHiddenSlides)
          }
          break
        case 'End':
          if (slideIndices.length > 0) {
            const lastIndex = slideIndices[slideIndices.length - 1]
            setNavigation({activeIndex: lastIndex, showHiddenSlides})
            sendSlideChange(lastIndex, 'presenter', showHiddenSlides)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrev, goToNext, slideIndices, showHiddenSlides, sendSlideChange])

  const marpRenderData = useMemo(() => ({html, css, fonts}), [html, css, fonts])
  const currentNote = notes[activeIndex] || ''
  const hasNextSlide = nextIndex !== undefined

  if (html.length === 0) {
    return (
      <div className={styles.presenterView}>
        <div style={{padding: 24}}>슬라이드를 로드할 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.presenterView}>
      <div className={styles.timerBar}>
        <span className={styles.timer}>{elapsedTime}</span>
        <button
          className={isRunning ? styles.timerButtonRunning : styles.timerButton}
          onClick={toggle}
        >
          {isRunning ? '일시정지' : '시작'}
        </button>
        <button className={styles.timerButton} onClick={reset}>
          리셋
        </button>
      </div>

      <div className={styles.slidesContainer}>
        <div className={styles.slideWrapper}>
          <div className={styles.slideLabel}>
            현재 슬라이드
            {slideGroups.hidden.includes(activeIndex) ? ' · 숨김' : ''}
          </div>
          <div className={`marp-presenter-slide ${styles.slideContentCurrent}`}>
            <Marp
              rendered={marpRenderData}
              page={activeIndex + 1}
              border={false}
              className={`marp-presenter-container ${styles.marpContainer}`}
            />
          </div>
        </div>

        <div className={styles.slideWrapper}>
          <div className={styles.slideLabelNext}>다음 슬라이드</div>
          <div className={`marp-presenter-slide ${styles.slideContentNext}`}>
            {hasNextSlide ? (
              <Marp
                rendered={marpRenderData}
                page={nextIndex + 1}
                border={false}
                className={`marp-presenter-container ${styles.marpContainer}`}
              />
            ) : (
              <div className={styles.noNextSlide}>마지막 슬라이드</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.notesPanel}>
        <div className={styles.notesLabel}>발표자 노트</div>
        <div className={styles.notesContent}>
          {currentNote || <span className={styles.noNotes}>노트 없음</span>}
        </div>
      </div>

      <div className={styles.controlBar}>
        <button
          className={styles.navButton}
          onClick={goToPrev}
          disabled={activePosition === 0}
        >
          ◀ 이전
        </button>
        <span className={styles.pageIndicator}>
          {activePosition + 1} / {slideIndices.length}
          {showHiddenSlides && slideGroups.hidden.length > 0
            ? ' · 숨김 포함'
            : ''}
        </span>
        <button
          className={styles.navButton}
          onClick={goToNext}
          disabled={!hasNextSlide}
        >
          다음 ▶
        </button>
      </div>

      <div className={styles.keyHints}>
        ← → 슬라이드 이동
        <br />
        Space 다음 슬라이드
        <br />
        Home / End 처음 / 끝
      </div>
    </div>
  )
}
