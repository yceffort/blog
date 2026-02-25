'use client'

import {usePathname} from 'next/navigation'

export function useLocale() {
  const pathname = usePathname() ?? '/'
  const isEn = pathname.startsWith('/en')

  return {
    locale: (isEn ? 'en' : 'ko') as 'en' | 'ko',
    pathPrefix: isEn ? '/en' : '',
    alternatePath: isEn ? pathname.replace(/^\/en/, '') || '/' : `/en${pathname}`,
  }
}
