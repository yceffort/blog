'use client'

import Image from 'next/image'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {memo, useEffect, useState, type ReactNode} from 'react'

import Footer from '@/components/Footer'
import MobileNav from '@/components/MobileNav'
import SectionContainer from '@/components/SectionContainer'
import TweaksPanel from '@/components/TweaksPanel'
import {SiteConfig} from '@/config'
import profile from '@/public/profile.png'

const HeaderLogo = memo(function HeaderLogoBase() {
  return (
    <Link
      href="/"
      aria-label="yceffort research"
      className="flex items-center gap-3"
    >
      <div className="logo-ring" aria-hidden="true">
        <span>
          <Image
            src={profile}
            alt=""
            width={40}
            height={40}
            placeholder="blur"
            className="h-10 w-10 rounded-full"
            priority
          />
        </span>
      </div>
      <div className="logo-name">yceffort</div>
    </Link>
  )
})

const HeaderNav = memo(function HeaderNavBase() {
  const pathname = usePathname() ?? '/'
  const isActive = (path: string) => {
    if (path.startsWith('http')) {
      return false
    }
    return pathname === path || pathname.startsWith(`${path}/`)
  }
  const items = [{label: 'Home', path: '/'}, ...SiteConfig.menu]
  return (
    <nav className="nav-pills hidden items-center sm:flex" aria-label="main">
      {items.map((link) => {
        const external = link.path.startsWith('http')
        const active = !external && isActive(link.path)
        const common = {
          className: 'nav-link',
          'data-active': active ? 'true' : 'false',
          'data-external': external ? 'true' : 'false',
        } as const
        if (external) {
          return (
            <a
              key={link.label}
              href={link.path}
              target="_blank"
              rel="noopener noreferrer"
              {...common}
            >
              <span className="nav-link-label">{link.label}</span>
              <svg
                className="nav-link-ext"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17L17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
          )
        }
        return (
          <Link key={link.label} href={link.path} {...common}>
            <span className="nav-link-label">{link.label}</span>
          </Link>
        )
      })}
    </nav>
  )
})

function Header() {
  const [tweaksOpen, setTweaksOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTweaksOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <HeaderLogo />
          <div className="header-right">
            <HeaderNav />
            <span className="header-sep" aria-hidden="true" />
            <div className="header-icons">
              <button
                type="button"
                className="icon-btn"
                aria-label="Tweaks"
                aria-expanded={tweaksOpen}
                onClick={() => setTweaksOpen((v) => !v)}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <a
                href="https://github.com/yceffort"
                target="_blank"
                rel="noopener noreferrer"
                className="icon-btn"
                aria-label="GitHub"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-[18px] w-[18px]"
                  fill="currentColor"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </div>
            <MobileNav />
          </div>
        </div>
      </header>
      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
    </>
  )
}

const LayoutWrapper = ({children}: {children: ReactNode}) => {
  const pathname = usePathname()
  const containerClass = pathname === '/' ? 'xl:max-w-7xl' : 'xl:max-w-5xl'

  return (
    <>
      <Header />
      <SectionContainer className={containerClass}>
        <main className="min-h-[calc(100vh-260px)] pt-6">{children}</main>
        <Footer />
      </SectionContainer>
    </>
  )
}

export default LayoutWrapper
