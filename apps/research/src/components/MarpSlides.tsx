"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import { Marp } from "./Marp";
import styles from "./MarpSlides.module.scss";

import type { MouseEvent } from "react";
import type { Swiper as SwiperClass } from "swiper";

interface MarpSlidesProps {
  dataHtml: string;
  dataCss: string;
  dataFonts: string;
}

export function MarpSlides({ dataHtml, dataCss, dataFonts }: MarpSlidesProps) {
  // JSON 파싱에 에러 처리 추가 (memoized)
  const html = useMemo(() => {
    try {
      return JSON.parse(dataHtml) as string[];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to parse HTML data:", error);
      return [];
    }
  }, [dataHtml]);

  const fonts = useMemo(() => {
    try {
      return JSON.parse(dataFonts) as string[];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to parse fonts data:", error);
      return [];
    }
  }, [dataFonts]);

  const css = dataCss;

  // 초기 해시값에서 activeIndex 설정 (memoized)
  const getInitialIndex = useCallback(() => {
    if (typeof window === "undefined") {
      return 0;
    }

    const hash = window.location.hash;
    if (hash.startsWith("#")) {
      const pageNum = parseInt(hash.slice(1), 10);
      if (!isNaN(pageNum) && pageNum > 0 && pageNum <= html.length) {
        return pageNum - 1;
      }
    }
    return 0;
  }, [html.length]);

  // 상태 관리
  const [activeIndex, setActiveIndex] = useState(0);
  const [isBottomHovered, setIsBottomHovered] = useState(false);
  const swiperRef = useRef<SwiperClass | null>(null);

  // memoized values
  const multiple = useMemo(() => html.length > 1, [html.length]);

  // 클라이언트에서만 실행되는 초기화
  useEffect(() => {
    const initialIndex = getInitialIndex();
    if (initialIndex > 0) {
      setActiveIndex(initialIndex);
      swiperRef.current?.slideTo(initialIndex, 0);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 슬라이드 변경 핸들러 (memoized)
  const handleActiveIndexChange = useCallback((instance: SwiperClass) => {
    const newIndex = instance.activeIndex;
    setActiveIndex(newIndex);
    if (typeof window !== "undefined") {
      window.location.hash = `#${newIndex + 1}`;
    }
  }, []);

  // Swiper 초기화 핸들러 (memoized)
  const handleSwiper = useCallback((instance: SwiperClass) => {
    swiperRef.current = instance;
  }, []);

  // 키보드 네비게이션
  useEffect(() => {
    if (!multiple) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          swiperRef.current?.slidePrev();
          break;
        case "ArrowRight":
          swiperRef.current?.slideNext();
          break;
        case "Home":
          swiperRef.current?.slideTo(0);
          break;
        case "End":
          swiperRef.current?.slideTo(html.length - 1);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [multiple, html.length]);

  // 클릭 네비게이션 (좌우/상하 10% 영역) (memoized)
  const handleSlideClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPos = e.clientX - rect.left;
      const yPos = e.clientY - rect.top;
      const xPercent = (xPos / rect.width) * 100;
      const yPercent = (yPos / rect.height) * 100;

      // 상단 10% 영역 클릭 - 첫 슬라이드로
      if (yPercent <= 10) {
        if (multiple && swiperRef.current) {
          swiperRef.current.slideTo(0);
        }
      }
      // 하단 10% 영역 클릭 - 루트 페이지로
      else if (yPercent >= 90) {
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
      }
      // 좌측 10% 영역 클릭 - 이전 슬라이드
      else if (xPercent <= 10 && multiple && swiperRef.current) {
        swiperRef.current.slidePrev();
      }
      // 우측 10% 영역 클릭 - 다음 슬라이드
      else if (xPercent >= 90 && multiple && swiperRef.current) {
        swiperRef.current.slideNext();
      }
      // 중앙 영역은 아무 동작 없음
    },
    [multiple],
  );

  // 해시 변경 감지
  useEffect(() => {
    if (!multiple) {
      return;
    }

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (!hash.startsWith("#")) {
        return;
      }

      const pageNum = parseInt(hash.slice(1), 10);
      if (isNaN(pageNum) || pageNum < 1 || pageNum > html.length) {
        return;
      }

      const newIndex = pageNum - 1;
      if (newIndex !== activeIndex) {
        swiperRef.current?.slideTo(newIndex);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [multiple, html.length, activeIndex]);

  // 하단 호버 핸들러 (memoized)
  const handleBottomEnter = useCallback(() => setIsBottomHovered(true), []);
  const handleBottomLeave = useCallback(() => setIsBottomHovered(false), []);

  // Marp 렌더링 데이터 (memoized)
  const marpRenderData = useMemo(
    () => ({ html, css, fonts }),
    [html, css, fonts],
  );

  // 에러 상태 처리
  if (html.length === 0) {
    return (
      <div className={styles.errorMessage}>슬라이드를 로드할 수 없습니다.</div>
    );
  }

  return (
    <div className={`${styles.marpSlides} ${multiple ? styles.multiple : ""}`}>
      <Swiper
        enabled={multiple}
        allowTouchMove={multiple}
        speed={300}
        onActiveIndexChange={handleActiveIndexChange}
        onSwiper={handleSwiper}
        // 접근성 개선
        a11y={{
          enabled: true,
          prevSlideMessage: "이전 슬라이드",
          nextSlideMessage: "다음 슬라이드",
          firstSlideMessage: "첫 번째 슬라이드",
          lastSlideMessage: "마지막 슬라이드",
          paginationBulletMessage: "슬라이드 {{index}}로 이동",
        }}
      >
        {html.map((_, i) => (
          <SwiperSlide key={i}>
            <div
              onClick={handleSlideClick}
              className={styles.marpSlide}
              role={multiple ? "button" : undefined}
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

      {/* 페이지 인디케이터 */}
      {multiple && (
        <div
          className={`${styles.pageIndicator} ${isBottomHovered ? styles.visible : ""}`}
        >
          {activeIndex + 1} / {html.length}
        </div>
      )}
    </div>
  );
}
