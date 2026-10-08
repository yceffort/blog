'use client'

import * as stylex from '@stylexjs/stylex'
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
    pathname === '/about' ||
    pathname === '/resume' ||
    pathname.startsWith('/pages') ||
    pathname.startsWith('/series') ||
    pathname.startsWith('/tags') ||
    enSlugs.includes(pathname.slice(1))
  // 프록시가 locale=en 쿠키를 보고 /를 /en으로 보내므로, 쿠키가 en일 때 받아 둔 / 프리페치를
  // 라우터가 재사용하지 않도록 클라이언트 내비게이션 대신 문서 요청으로 이동한다
  return (
    <a
      href={hasEnPage ? alternatePath : '/en'}
      onClick={() => {
        document.cookie = `locale=${locale === 'ko' ? 'en' : 'ko'};path=/;max-age=${60 * 60 * 24 * 365}`
      }}
      className={`icon-btn ${headerStyles.icon_btn} ${stylex.props(sx.link).className}`}
      aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
    >
      {locale === 'ko' ? 'EN' : 'KO'}
    </a>
  )
}
