'use client'

import {getCookie} from '@yceffort/shared/utils'
import {useTheme} from 'next-themes'
import {useEffect} from 'react'

// 블로그나 리서치에서 바꾼 테마와 액센트 색(.yceffort.kr 쿠키)을 탭으로 돌아올 때 다시 따라간다.
export default function PreferenceSync() {
  const {setTheme} = useTheme()
  useEffect(() => {
    const sync = () => {
      const theme = getCookie('tw-theme')
      if (theme) setTheme(theme)
      const accent = getCookie('tw-accent')
      if (accent) document.body.dataset.accent = accent
    }
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('pageshow', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pageshow', sync)
    }
  }, [setTheme])
  return null
}
