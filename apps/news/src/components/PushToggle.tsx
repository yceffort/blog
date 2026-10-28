'use client'

import {usePushSubscription} from '@yceffort/shared/hooks'
import {startTransition, useOptimistic} from 'react'

import * as styles from '@/components/FloatingActions.styles'

// 새 호 알림 구독. iOS는 홈 화면에 설치한 앱에서만 PushManager가 있어서 탭에서는 버튼이 숨는다.
export default function PushToggle() {
  const {pushState, togglePush} = usePushSubscription('news_floating')
  // 구독은 푸시 서비스 등록과 서버 저장이 끝나야 'on'이 되므로, 그동안 누른 결과를 먼저 보여 주고 실패하면 되돌린다.
  const [on, setOn] = useOptimistic(pushState === 'on')
  if (pushState === 'unsupported') {
    return null
  }
  const label = on ? '새 호 알림 끄기' : '새 호 알림 받기'
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() =>
        startTransition(async () => {
          setOn(!on)
          await togglePush()
        })
      }
      disabled={pushState === 'busy'}
      aria-pressed={on}
      aria-label={label}
      title={label}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    </button>
  )
}
