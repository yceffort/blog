'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'

import {useLocale} from '@/hooks/useLocale'

export default function LanguageSwitch({enSlugs}: {enSlugs: string[]}) {
  const {locale, alternatePath} = useLocale()
  const pathname = usePathname() ?? '/'

  // /en 하위에 실제 페이지가 있는 경로만 그대로 전환하고, 나머지는 영문 홈으로 보낸다
  const hasEnPage =
    locale === 'en' ||
    pathname === '/' ||
    pathname.startsWith('/pages') ||
    enSlugs.includes(pathname.slice(1))

  return (
    <Link
      href={hasEnPage ? alternatePath : '/en'}
      onClick={() => {
        document.cookie = `locale=${locale === 'ko' ? 'en' : 'ko'};path=/;max-age=${60 * 60 * 24 * 365}`
      }}
      className="icon-btn text-xs font-semibold"
      aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
    >
      {locale === 'ko' ? 'EN' : 'KO'}
    </Link>
  )
}
