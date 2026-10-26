'use client'

import * as stylex from '@stylexjs/stylex'
import {useLinkStatus} from 'next/link'

const sx = stylex.create({
  hint: {
    '@layer utilities': {
      position: 'absolute',
      insetInline: '0',
      bottom: '0',
      height: '2px',
      borderRadius: '999px',
      backgroundColor: 'var(--primary-3)',
      pointerEvents: 'none',
      opacity: {
        default: '0',
        ':is([data-pending="true"])': '1',
      },
      transitionProperty: 'opacity',
      transitionDuration: '150ms',
      // 바로 끝나는 이동에서는 깜빡이지 않도록 조금 늦게 켠다
      transitionDelay: {
        default: '0s',
        ':is([data-pending="true"])': '150ms',
      },
    },
  },
})

// 글 라우트에 loading.tsx를 두지 않으므로, 응답을 기다리는 동안 클릭한 링크 아래에 막대를 띄운다.
// 부모 링크가 위치 기준(position)이어야 한다
export default function LinkPendingHint() {
  const {pending} = useLinkStatus()
  return (
    <span
      aria-hidden="true"
      data-pending={pending}
      className={stylex.props(sx.hint).className}
    />
  )
}
