import Link from 'next/link'

import * as aboutStyles from '@/components/about/about.styles'
import type {Locale} from '@/utils/postPaths'

export function AboutTabs({
  active,
  locale,
}: {
  active: 'about' | 'resume'
  locale: Locale
}) {
  const prefix = locale === 'en' ? '/en' : ''
  return (
    <nav
      className={`tabs ${aboutStyles.tabs}`}
      aria-label={locale === 'en' ? 'About and resume' : '소개 및 이력'}
    >
      <Link
        href={`${prefix}/about`}
        data-active={active === 'about'}
        aria-current={active === 'about' ? 'page' : undefined}
        className={aboutStyles.about_tab_link}
      >
        About
      </Link>
      <Link
        href={`${prefix}/resume`}
        data-active={active === 'resume'}
        aria-current={active === 'resume' ? 'page' : undefined}
        className={aboutStyles.about_tab_link}
      >
        Resume
      </Link>
    </nav>
  )
}
