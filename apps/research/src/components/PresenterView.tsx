'use client'

import {useCallback, useEffect, useMemo, useState} from 'react'

import {useBroadcastChannel} from '@/hooks/useBroadcastChannel'
import {useTimer} from '@/hooks/useTimer'

import {Marp} from './Marp'
import styles from './PresenterView.module.scss'

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
  const [activeIndex, setActiveIndex] = useState(0)
  const {elapsedTime, isRunning, toggle, reset} = useTimer()

  const {sendSlideChange, requestSync} = useBroadcastChannel(
    `marp-slides-${slug}`,
    {
      onSlideChange: (index) => setActiveIndex(index),
    },
  )

  useEffect(() => {
    requestSync()
  }, [requestSync])

  const goToPrev = useCallback(() => {
    if (activeIndex > 0) {
      const newIndex = activeIndex - 1
      setActiveIndex(newIndex)
      sendSlideChange(newIndex, 'presenter')
    }
  }, [activeIndex, sendSlideChange])

  const goToNext = useCallback(() => {
    if (activeIndex < html.length - 1) {
      const newIndex = activeIndex + 1
      setActiveIndex(newIndex)
      sendSlideChange(newIndex, 'presenter')
    }
  }, [activeIndex, html.length, sendSlideChange])

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
          setActiveIndex(0)
          sendSlideChange(0, 'presenter')
          break
        case 'End':
          setActiveIndex(html.length - 1)
          sendSlideChange(html.length - 1, 'presenter')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrev, goToNext, html.length, sendSlideChange])

  const marpRenderData = useMemo(() => ({html, css, fonts}), [html, css, fonts])
  const currentNote = notes[activeIndex] || ''
  const hasNextSlide = activeIndex < html.length - 1

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
          className={`${styles.timerButton} ${isRunning ? styles.running : ''}`}
          onClick={toggle}
        >
          {isRunning ? '일시정지' : '시작'}
        </button>
        <button className={styles.timerButton} onClick={reset}>
          리셋
        </button>
      </div>

      <div className={styles.slidesContainer}>
        <div className={`${styles.slideWrapper} ${styles.currentSlide}`}>
          <div className={styles.slideLabel}>현재 슬라이드</div>
          <div className={styles.slideContent}>
            <Marp
              rendered={marpRenderData}
              page={activeIndex + 1}
              border={false}
              className={styles.marpContainer}
            />
          </div>
        </div>

        <div className={`${styles.slideWrapper} ${styles.nextSlide}`}>
          <div className={styles.slideLabel}>다음 슬라이드</div>
          <div className={styles.slideContent}>
            {hasNextSlide ? (
              <Marp
                rendered={marpRenderData}
                page={activeIndex + 2}
                border={false}
                className={styles.marpContainer}
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
          disabled={activeIndex === 0}
        >
          ◀ 이전
        </button>
        <span className={styles.pageIndicator}>
          {activeIndex + 1} / {html.length}
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
