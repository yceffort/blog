import Link from 'next/link'

export function AboutTabs({active}: {active: 'about' | 'resume'}) {
  return (
    <div className="tabs">
      <Link href="/about" data-active={active === 'about'}>
        About
      </Link>
      <Link href="/resume" data-active={active === 'resume'}>
        Resume
      </Link>
    </div>
  )
}
