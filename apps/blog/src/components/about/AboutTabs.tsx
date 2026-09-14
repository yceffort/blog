import Link from 'next/link'

import * as aboutStyles from '@/components/about/about.styles'

export function AboutTabs({active}: {active: 'about' | 'resume'}) {
  return (
    <nav className={`tabs ${aboutStyles.tabs}`} aria-label="소개 및 이력">
      <Link
        href="/about"
        data-active={active === 'about'}
        aria-current={active === 'about' ? 'page' : undefined}
        className={aboutStyles.about_tab_link}
      >
        About
      </Link>
      <Link
        href="/resume"
        data-active={active === 'resume'}
        aria-current={active === 'resume' ? 'page' : undefined}
        className={aboutStyles.about_tab_link}
      >
        Resume
      </Link>
    </nav>
  )
}
