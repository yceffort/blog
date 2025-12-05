'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'

import Footer from './Footer'
import MobileNav from './MobileNav'
import ProfileImage from './ProfileImage'
import SectionContainer from './SectionContainer'
import ThemeSwitch from './ThemeSwitch'

import type {ReactNode} from 'react'

import {SiteConfig} from '#src/config'

const LayoutWrapper = ({children}: {children: ReactNode}) => {
  const pathname = usePathname()
  let containerClass = 'xl:max-w-5xl' // Default safe width for blog posts
  let wide = false

  if (pathname === '/') {
    containerClass = 'xl:max-w-7xl' // Wider for home page list
  } else if (pathname === '/about') {
    containerClass = 'max-w-6xl' // About page - fixed width
  } else if (pathname?.startsWith('/tags')) {
    containerClass = 'xl:max-w-7xl' // Wider for tags list
  }

  return (
    <SectionContainer className={wide ? '' : containerClass} wide={wide}>
      <div className="flex min-h-screen flex-col justify-between">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-black bg-white/90 py-6 backdrop-blur-none dark:border-white dark:bg-gray-800/90">
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
          <div className="flex items-center text-base leading-5">
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
            <ThemeSwitch />
            <MobileNav />
          </div>
        </header>
        <main className="mb-auto">{children}</main>
        <Footer />
      </div>
    </SectionContainer>
  )
}

export default LayoutWrapper
