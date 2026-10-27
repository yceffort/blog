'use client'

import {FloatingToc} from '@yceffort/shared/components'

import {floatingTocClassNames} from '@/components/FloatingActions.styles'
import PushToggle from '@/components/PushToggle'

// h2는 절, h3는 항목이다. 마크다운 렌더러가 id를 달지 않아 공통 컴포넌트가 요소를 직접 스크롤한다.
export default function FloatingActions() {
  return (
    <FloatingToc
      rootSelector=".news-body"
      headingSelector="h2, h3"
      shareContentType="issue"
      classNames={floatingTocClassNames}
      labels={{
        title: '이 호의 목차',
        close: '목차 닫기',
        scrollTop: '맨 위로',
        toggle: '목차 열기',
        share: '이 호 공유하기',
        copied: '링크를 복사했습니다',
      }}
    >
      <PushToggle />
    </FloatingToc>
  )
}
