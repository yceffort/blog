'use client'

import {FloatingToc} from '@yceffort/shared/components'

import * as readingProgressStyles from '@/components/post/reading-progress.styles'
import * as tableOfContentsStyles from '@/components/post/table-of-contents.styles'
import {useLocale} from '@/hooks/useLocale'

// 앞의 전역 클래스명은 tests/styles/baseline.css가 비교 기준으로 쓴다
const classNames = {
  root: `floating-toc ${tableOfContentsStyles.floating_toc}`,
  panel: `floating-toc-panel ${tableOfContentsStyles.floating_toc_panel}`,
  header: `floating-toc-header ${tableOfContentsStyles.floating_toc_header}`,
  title: tableOfContentsStyles.element_h2,
  close: `floating-toc-close ${tableOfContentsStyles.floating_toc_close}`,
  list: `floating-toc-list ${tableOfContentsStyles.floating_toc_list}`,
  ul: tableOfContentsStyles.element_ul,
  link: tableOfContentsStyles.element_a,
  scrollTop: `floating-toc-scroll-top ${tableOfContentsStyles.floating_toc_scroll_top}`,
  dial: `reading-progress-dial ${readingProgressStyles.reading_progress_dial}`,
  dialSvg: readingProgressStyles.reading_progress_dial_svg,
  dialTrack: `reading-progress-track ${readingProgressStyles.reading_progress_track}`,
  dialFill: `reading-progress-fill ${readingProgressStyles.reading_progress_fill}`,
  dialNum: `reading-progress-num ${readingProgressStyles.reading_progress_num}`,
  toast: `floating-toc-toast ${tableOfContentsStyles.floating_toc_toast}`,
  share: `floating-toc-share ${tableOfContentsStyles.floating_toc_share}`,
}

export default function TableOfContents() {
  const isEn = useLocale().locale === 'en'
  return (
    <FloatingToc
      rootSelector="article"
      headingSelector="h2, h3, h4"
      shareContentType="post"
      classNames={classNames}
      labels={{
        title: 'On this page',
        close: 'Close table of contents',
        scrollTop: 'Scroll to top',
        toggle: 'Toggle table of contents',
        share: isEn ? 'Share this post' : '이 글 공유하기',
        copied: isEn ? 'Link copied' : '링크를 복사했습니다',
      }}
    />
  )
}
