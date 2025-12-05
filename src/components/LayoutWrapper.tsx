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
  } else if (pathname === '/resume') {
    wide = true
  } else if (pathname?.startsWith('/tags')) {
    containerClass = 'xl:max-w-7xl' // Wider for tags list
  }

  return (
    <SectionContainer className={wide ? '' : containerClass} wide={wide}>
      <div className="flex min-h-screen flex-col justify-between">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-black bg-white/90 py-6 backdrop-blur-none dark:border-white dark:bg-gray-950/90">
          <div>
            <Link href="/" aria-label="yceffort's blog">
              <div className="flex items-center justify-between">
                <div className="mr-3">
                  <ProfileImage size={40} />
                </div>
                <div className="hidden h-6 text-2xl font-semibold sm:block">
                  {SiteConfig.title}
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
