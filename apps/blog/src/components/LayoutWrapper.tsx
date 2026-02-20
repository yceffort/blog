'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {memo} from 'react'

import AnimatedBackground from './AnimatedBackground'
import FloatingBanner from './Banner'
import Footer from './Footer'
import MobileNav from './MobileNav'
import ProfileImage from './ProfileImage'
import ScrollTop from './ScrollTop'
import SectionContainer from './SectionContainer'

import type {ReactNode} from 'react'

import {SiteConfig} from '#src/config'

const DynamicThemeSwitch = dynamic(() => import('./ThemeSwitch'), {
  ssr: false,
  loading: () => <div className="ml-1 mr-1 h-10 w-10 rounded-md sm:ml-4" />,
})

const DynamicWeatherEffect = dynamic(() => import('./WeatherEffect'), {
  ssr: false,
})

const HeaderLogo = memo(function HeaderLogo() {
  return (
    <div>
      <Link href="/" aria-label="yceffort's blog">
        <div className="flex items-center justify-between">
          <div className="mr-3">
            <ProfileImage size={40} />
          </div>
          <div className="h-6 text-base font-semibold sm:text-2xl">
            <span className="font-mono text-green-600 dark:text-green-400">
              $
            </span>{' '}
            <span className="hidden sm:inline">{SiteConfig.title}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                document.dispatchEvent(new CustomEvent('open-command-palette'))
              }}
              className="ml-1 inline-block h-4 w-1.5 translate-y-0.5 animate-blink bg-current hover:bg-green-500 sm:h-5 sm:w-2"
              aria-label="Open search"
            />
          </div>
        </div>
      </Link>
    </div>
  )
})

const HeaderNav = memo(function HeaderNav() {
  return (
    <div className="hidden sm:block">
      {SiteConfig.menu.map((link) => (
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
})

function Header() {
  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between py-6 backdrop-blur-sm"
    >
      <HeaderLogo />
      <div className="flex items-center text-base leading-5">
        <HeaderNav />
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

  if (pathname === '/') {
    containerClass = 'xl:max-w-7xl'
  } else if (pathname === '/about') {
    containerClass = 'max-w-6xl'
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
        <FloatingBanner />
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
