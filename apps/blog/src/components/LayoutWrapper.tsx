'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

import AnimatedBackground from './AnimatedBackground'
import FloatingBanner from './Banner'
import Footer from './Footer'
import MobileNav from './MobileNav'
import ProfileImage from './ProfileImage'
import ScrollTop from './ScrollTop'
import SectionContainer from './SectionContainer'

import type {ReactNode} from 'react'

import {SiteConfig} from '#src/config'
import {useLocale} from '#src/hooks/useLocale'

import LanguageSwitch from './LanguageSwitch'

const DynamicThemeSwitch = dynamic(() => import('./ThemeSwitch'), {
  ssr: false,
  loading: () => <div className="ml-1 mr-1 h-10 w-10 rounded-md sm:ml-4" />,
})

const DynamicWeatherEffect = dynamic(() => import('./WeatherEffect'), {
  ssr: false,
})

function HeaderLogo() {
  const {pathPrefix} = useLocale()
  return (
    <div>
      <Link href={pathPrefix || '/'} aria-label="yceffort's blog">
        <div className="flex items-center justify-between">
          <div className="mr-3">
            <ProfileImage size={40} />
          </div>
        </div>
      </Link>
    </div>
  )
}

function HeaderNav() {
  const {pathPrefix} = useLocale()
  const menu = pathPrefix
    ? SiteConfig.menu.map((link) =>
        link.path === '/pages/1' ? {...link, path: `${pathPrefix}/pages/1`} : link,
      )
    : SiteConfig.menu

  return (
    <div className="hidden sm:block">
      {menu.map((link) => (
        <Link
          key={link.label}
          href={link.path}
          className="p-1 font-medium text-gray-900 dark:text-gray-100 sm:p-4"
        >
          {link.label}
        </Link>
      ))}
    </div>
  )
}

function Header() {
  return (
    <header
      className="sticky top-0 z-40 -mx-[calc(50vw-50%)] flex items-center justify-between px-[calc(50vw-50%)] py-6 backdrop-blur-md"
    >
      <HeaderLogo />
      <div className="flex items-center text-base leading-5">
        <HeaderNav />
        <a
          href="https://github.com/yceffort"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 flex h-10 w-10 items-center justify-center rounded-md p-2 text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 sm:ml-4"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
        <LanguageSwitch />
        <DynamicThemeSwitch />
        <MobileNav />
      </div>
    </header>
  )
}

const LayoutWrapper = ({children}: {children: ReactNode}) => {
  const pathname = usePathname()
  let containerClass = 'xl:max-w-5xl'
  const wide = false

  if (pathname === '/' || pathname === '/en') {
    containerClass = 'xl:max-w-7xl'
  } else if (pathname === '/about') {
    containerClass = 'max-w-6xl'
  } else if (pathname?.startsWith('/pages') || pathname?.startsWith('/en/pages')) {
    containerClass = 'xl:max-w-7xl'
  } else if (pathname?.startsWith('/tags')) {
    containerClass = 'xl:max-w-7xl'
  }

  return (
    <SectionContainer className={wide ? '' : containerClass} wide={wide}>
      <AnimatedBackground />
      <div className="flex min-h-screen flex-col justify-between">
        <Header />
        <main className="mb-auto">{children}</main>
        <Footer />
        <ScrollTop />
        <DynamicWeatherEffect />
        {pathname !== '/' && !pathname?.startsWith('/en') && <FloatingBanner />}
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
