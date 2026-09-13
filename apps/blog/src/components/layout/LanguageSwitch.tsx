'use client'

import * as stylex from '@stylexjs/stylex'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

import * as headerStyles from '@/components/layout/header.styles'
import {useLocale} from '@/hooks/useLocale'

const sx = stylex.create({
  link: {
    '@layer utilities': {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      fontWeight: 'var(--font-weight-semibold)',
    },
  },
})
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
      className={`icon-btn ${headerStyles.icon_btn} ${stylex.props(sx.link).className}`}
      aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
    >
      {locale === 'ko' ? 'EN' : 'KO'}
    </Link>
  )
}
