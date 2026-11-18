'use client'

import * as stylex from '@stylexjs/stylex'
import {useState, useSyncExternalStore} from 'react'

const sx = stylex.create({
  wrap: {
    '@layer utilities': {
      display: 'flex',
      minHeight: '50vh',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    },
  },
  h1: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 3)',
      fontSize: 'var(--text-2xl)',
      lineHeight: 'var(--blog-leading, var(--text-2xl--line-height))',
      fontWeight: 'var(--font-weight-bold)',
      color: {
        default: 'oklch(21% 0.006 285.885)',
        ':is(.dark *)': 'oklch(96.7% 0.001 286.375)',
      },
    },
  },
  p: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 6)',
      maxWidth: 'var(--container-md)',
      wordBreak: 'keep-all',
      color: {
        default: 'oklch(44.2% 0.017 285.786)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
    },
  },
  button: {
    '@layer utilities': {
      borderWidth: 0,
      borderRadius: 'var(--radius-lg)',
      backgroundColor: {
        default: 'oklch(21% 0.006 285.885)',
        ':is(.dark *)': 'oklch(96.7% 0.001 286.375)',
      },
      paddingInline: 'calc(var(--spacing) * 5)',
      paddingBlock: 'calc(var(--spacing) * 2.5)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--font-weight-medium)',
      color: {
        default: 'var(--color-white)',
        ':is(.dark *)': 'oklch(21% 0.006 285.885)',
      },
      cursor: {default: 'pointer', ':disabled': 'progress'},
      opacity: {default: 1, ':disabled': 0.6},
    },
  },
})

const COPY = {
  ready: {
    title: '메일 구독을 확인해 주세요',
    body: '아래 버튼을 누르면 구독이 끝납니다. 매주 월요일 아침, 지난주에 쓴 글을 모아 보내 드립니다.',
  },
  done: {
    title: '구독했습니다',
    body: '다음 월요일 아침에 첫 메일이 갑니다. 그 주에 쓴 글이 없으면 건너뜁니다. 메일 아래쪽 링크로 언제든 해지할 수 있습니다.',
  },
  invalid: {
    title: '링크가 맞지 않습니다',
    body: '링크가 잘렸거나 48시간이 지났습니다. 글 끝의 구독 칸에서 다시 신청해 주세요.',
  },
  error: {
    title: '구독하지 못했습니다',
    body: '잠시 뒤 다시 눌러 주세요. 계속 안 되면 메일에 답장으로 알려 주시면 확인하겠습니다.',
  },
}

const readToken = () => new URLSearchParams(location.search).get('token')
const subscribe = () => () => {}

export default function NewsletterConfirm() {
  const token = useSyncExternalStore(subscribe, readToken, () => undefined)
  const [state, setState] = useState<
    'ready' | 'busy' | 'done' | 'invalid' | 'error'
  >('ready')

  async function confirm() {
    setState('busy')
    try {
      const response = await fetch('/api/newsletter/confirm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token}),
      })
      if (response.ok) {
        setState('done')
        window.gtag?.('event', 'newsletter_confirm')
        return
      }
      setState(response.status === 400 ? 'invalid' : 'error')
    } catch {
      setState('error')
    }
  }

  // 서버 렌더와 첫 하이드레이션에서는 토큰을 모르므로 확인 안내만 그린다
  const view = token === null ? 'invalid' : state === 'busy' ? 'ready' : state
  const copy = COPY[view]
  return (
    <div {...stylex.props(sx.wrap)}>
      <h1 {...stylex.props(sx.h1)}>{copy.title}</h1>
      <p {...stylex.props(sx.p)}>{copy.body}</p>
      {view === 'ready' || view === 'error' ? (
        <button
          type="button"
          disabled={!token || state === 'busy'}
          onClick={() => void confirm()}
          {...stylex.props(sx.button)}
        >
          구독 확인
        </button>
      ) : null}
    </div>
  )
}
