'use client'

import {usePushSubscription} from '@yceffort/shared/hooks'
import {setCookie} from '@yceffort/shared/utils'
import type {FormEvent, ReactNode} from 'react'
import {useState, useSyncExternalStore} from 'react'

import AnnouncementBanner, {
  NEWSLETTER_ANCHOR,
  NEWSLETTER_NOTICE_COOKIE,
} from '@/components/layout/AnnouncementBanner'

// iOS는 홈 화면에 추가한 앱에서만 PushManager가 있어서, 브라우저 탭에서는 추가하는 방법을 안내한다.
// iPadOS는 데스크톱 UA를 쓰므로 터치 지원 여부로 구분한다.
function isIOSBrowserTab() {
  const isIOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return isIOS && !('PushManager' in window)
}

const subscribe = () => () => {}

function SubscribeBox({
  id,
  title,
  children,
  actions,
}: {
  id?: string
  title: string
  children?: ReactNode
  actions?: ReactNode
}) {
  return (
    <aside id={id} className="post-subscribe" data-nav="subscribe">
      <span className="post-subscribe-icon" aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </span>
      <div className="post-subscribe-body">
        <p className="post-subscribe-title">{title}</p>
        {children}
      </div>
      {actions ? <div className="post-subscribe-actions">{actions}</div> : null}
    </aside>
  )
}

const EMAIL_STATUS = {
  sent: "확인 메일을 보냈습니다. 메일함에서 '구독 확인'을 눌러야 구독이 끝납니다.",
  invalid: '메일 주소를 다시 확인해 주세요.',
  limited: '요청이 많았습니다. 잠시 뒤 다시 시도해 주세요.',
  error: '보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
}

// 주간 메일은 한국어 글만 묶으므로 한국어 글 끝에만 둔다
function EmailSubscribe({links}: {links: ReactNode}) {
  const [state, setState] = useState<
    'idle' | 'busy' | keyof typeof EMAIL_STATUS
  >('idle')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setState('busy')
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: form.get('email'),
          website: form.get('website'),
        }),
      })
      if (response.ok) {
        setState('sent')
        setCookie(NEWSLETTER_NOTICE_COOKIE, '1')
        window.gtag?.('event', 'newsletter_subscribe_request', {
          placement: 'post_end',
        })
        return
      }
      setState(
        response.status === 400
          ? 'invalid'
          : response.status === 429
            ? 'limited'
            : 'error',
      )
    } catch {
      setState('error')
    }
  }

  return (
    <SubscribeBox
      id={NEWSLETTER_ANCHOR}
      title="월요일 아침, 지난주 글을 메일로"
    >
      <p>한 주에 한 번 모아서 보내드립니다.</p>
      {state === 'sent' ? null : (
        <form className="post-subscribe-form" onSubmit={(e) => void submit(e)}>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            aria-label="메일 주소"
            className="post-subscribe-input"
          />
          {/* 봇만 채우는 칸. 화면과 보조 기술에서 모두 숨긴다 */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="post-subscribe-trap"
          />
          <button
            type="submit"
            className="post-subscribe-button"
            disabled={state === 'busy'}
          >
            구독
          </button>
        </form>
      )}
      {/* 개인정보 수집 고지: 목적, 항목, 보유 기간, 국외 이전, 거부할 권리. 해지한 주소는 send.mjs가 매주 지운다 */}
      {state === 'sent' ? null : (
        <p className="post-subscribe-note">
          메일 주소는 주간 메일 발송에만 쓰고, 구독을 해지하면 일주일 안에
          지웁니다. 발송은 Resend(미국)가 맡습니다. 동의하지 않으면 메일을 받을
          수 없습니다.
        </p>
      )}
      {state in EMAIL_STATUS ? (
        <output className="post-subscribe-status">
          {EMAIL_STATUS[state as keyof typeof EMAIL_STATUS]}
        </output>
      ) : null}
      <div className="post-subscribe-more">{links}</div>
    </SubscribeBox>
  )
}

// 노출과 RSS 클릭은 data-nav로 InternalNavTracker가, 구독은 push_subscribe와 newsletter_subscribe_request(placement: post_end)가 잡는다.
export default function SubscribeCta({lang = 'ko'}: {lang?: 'ko' | 'en'}) {
  const {pushState, togglePush} = usePushSubscription('post_end')
  const needsHomeScreen = useSyncExternalStore(
    subscribe,
    isIOSBrowserTab,
    () => false,
  )
  const canPush =
    pushState !== 'unsupported' && Notification.permission !== 'denied'
  if (lang === 'ko') {
    return (
      <>
        <AnnouncementBanner />
        <EmailSubscribe
          links={
            <>
              {canPush && pushState !== 'on' ? (
                <button
                  type="button"
                  className="post-subscribe-link"
                  disabled={pushState === 'busy'}
                  onClick={() => void togglePush()}
                >
                  브라우저 알림 받기 →
                </button>
              ) : null}
              {/* oxlint-disable-next-line next/no-html-link-for-pages -- 피드는 페이지가 아니라 XML 라우트다 */}
              <a href="/feed.xml" className="post-subscribe-link">
                RSS 구독 →
              </a>
            </>
          }
        />
      </>
    )
  }
  const rssLink = (
    // oxlint-disable-next-line next/no-html-link-for-pages -- 피드는 페이지가 아니라 XML 라우트다
    <a href="/en/feed.xml" className="post-subscribe-link">
      Subscribe via RSS →
    </a>
  )

  if (pushState === 'on') {
    return (
      <SubscribeBox title="New post alerts are on" actions={rssLink}>
        <p>
          You&apos;ll get a notification when a new post is published. To turn
          it off, open settings (the gear icon) at the top.
        </p>
      </SubscribeBox>
    )
  }

  if (canPush) {
    return (
      <SubscribeBox
        title="Want to know when a new post is published?"
        actions={
          <>
            <button
              type="button"
              className="post-subscribe-button"
              disabled={pushState === 'busy'}
              onClick={() => void togglePush()}
            >
              Get notified
            </button>
            {rssLink}
          </>
        }
      >
        <p>
          I&apos;ll send a browser notification when a new post goes up. You can
          turn it off anytime.
        </p>
      </SubscribeBox>
    )
  }

  if (needsHomeScreen) {
    return (
      <SubscribeBox
        title="Get new post alerts on iPhone or iPad"
        actions={rssLink}
      >
        <ol className="post-subscribe-steps">
          <li>Tap Share and choose &apos;Add to Home Screen&apos;.</li>
          <li>Open the yceffort app from your Home Screen.</li>
          <li>Open settings (the gear icon) and turn on new post alerts.</li>
        </ol>
      </SubscribeBox>
    )
  }

  return (
    <SubscribeBox title="Enjoyed this post?" actions={rssLink}>
      <p>Subscribe via RSS to get new posts.</p>
    </SubscribeBox>
  )
}
