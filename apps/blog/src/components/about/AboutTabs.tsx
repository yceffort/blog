import Link from 'next/link'

export function AboutTabs({active}: {active: 'about' | 'resume'}) {
  return (
    <nav className="tabs" aria-label="소개 및 이력">
      <Link
        href="/about"
        data-active={active === 'about'}
        aria-current={active === 'about' ? 'page' : undefined}
      >
        About
      </Link>
      <Link
        href="/resume"
        data-active={active === 'resume'}
        aria-current={active === 'resume' ? 'page' : undefined}
      >
        Resume
      </Link>
    </nav>
  )
}
