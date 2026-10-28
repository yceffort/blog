'use client'

import {tweaksStyles} from '@yceffort/shared/components'
import {getCookie, setCookie} from '@yceffort/shared/utils'
import {useEffect, useState} from 'react'

import {
  isTransitionType,
  TRANSITION_TYPES,
} from '@/components/MarpSlides.constants'
import type {TransitionType} from '@/components/MarpSlides.constants'

// 공통 Tweaks 패널 뒤에 붙는 research 고유 항목
export default function ResearchTweaks() {
  const [transition, setTransition] = useState<TransitionType>(() => {
    if (typeof window === 'undefined') {
      return 'slide'
    }
    const stored = getCookie('tw-transition')
    return isTransitionType(stored) ? stored : 'slide'
  })

  useEffect(() => {
    document.body.dataset.transition = transition
    setCookie('tw-transition', transition)
  }, [transition])

  return (
    <div className={tweaksStyles.tweaks_row_next}>
      <div className={tweaksStyles.tweaks_label}>slide transition</div>
      <div className={tweaksStyles.tweaks_theme}>
        {TRANSITION_TYPES.map((key) => (
          <button
            key={key}
            type="button"
            className={tweaksStyles.tweaks_theme_btn}
            data-on={transition === key}
            aria-label={key}
            onClick={() => setTransition(key)}
          >
            <span>{key}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
