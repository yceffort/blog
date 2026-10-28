'use client'

import {TweaksSwitchRow, tweaksStyles} from '@yceffort/shared/components'
import {usePushSubscription} from '@yceffort/shared/hooks'
import {getCookie, setCookie} from '@yceffort/shared/utils'
import {startTransition, useEffect, useOptimistic, useState} from 'react'

// 공통 Tweaks 패널 뒤에 붙는 blog 고유 항목
export default function BlogTweaks() {
  const [mounted, setMounted] = useState(false)
  const [tilt, setTilt] = useState<number>(8)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // research.yceffort.kr 와 쿠키를 공유하므로, 다른 탭에서 바꾼 값을 탭이 다시 보일 때 반영한다.
    const syncFromCookie = () => {
      if (document.visibilityState === 'hidden') {
        return
      }
      const t = Number(getCookie('tw-tilt') || '8')
      setTilt(Number.isFinite(t) ? t : 8)
    }
    syncFromCookie()
    setMounted(true)
    document.addEventListener('visibilitychange', syncFromCookie)
    window.addEventListener('pageshow', syncFromCookie)
    return () => {
      document.removeEventListener('visibilitychange', syncFromCookie)
      window.removeEventListener('pageshow', syncFromCookie)
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) {
      return
    }
    document.documentElement.style.setProperty('--tilt', String(tilt))
    setCookie('tw-tilt', String(tilt))
  }, [mounted, tilt])
  const {pushState, togglePush} = usePushSubscription('tweaks')
  // 구독은 푸시 서비스 등록과 서버 저장이 끝나야 'on'이 되므로, 그동안 누른 결과를 먼저 보여 주고 실패하면 되돌린다.
  const [pushOn, setPushOn] = useOptimistic(pushState === 'on')
  const onTogglePush = () => {
    // 스위치가 버튼이 아니라 처리 중에도 눌리므로, 그때 겉모습만 뒤집히지 않게 막는다.
    if (pushState === 'busy') {
      return
    }
    startTransition(async () => {
      setPushOn(!pushOn)
      await togglePush()
    })
  }
  return (
    <>
      <div className={tweaksStyles.tweaks_row_next}>
        <label
          className={`${tweaksStyles.tweaks_label} ${tweaksStyles.element_label}`}
          htmlFor="tweaks-tilt"
        >
          {'tilt intensity '}
          <span className={tweaksStyles.tweaks_val}>{tilt}°</span>
        </label>
        <input
          id="tweaks-tilt"
          type="range"
          min={0}
          max={24}
          step={1}
          value={tilt}
          onChange={(e) => setTilt(Number(e.target.value))}
          className={tweaksStyles.element_input}
        />
      </div>

      {pushState !== 'unsupported' && (
        <TweaksSwitchRow
          label="new post alerts"
          on={pushOn}
          busy={pushState === 'busy'}
          onToggle={onTogglePush}
        />
      )}
    </>
  )
}
