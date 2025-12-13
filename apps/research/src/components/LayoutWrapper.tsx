'use client'

import {memo} from 'react'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

import type {ReactNode} from 'react'

import Footer from '@/components/Footer'
import MobileNav from '@/components/MobileNav'
import SectionContainer from '@/components/SectionContainer'
import {SiteConfig} from '@/config'
import profile from '@/public/profile.png'

const DynamicThemeSwitch = dynamic(() => import('./ThemeSwitch'), {
  ssr: false,
  loading: () => <div className="ml-1 mr-1 h-10 w-10 rounded-md sm:ml-4" />,
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

const HeaderLogo = memo(function HeaderLogo() {
  return (
    <div>
      <Link href="/" aria-label="yceffort's research">
        <div className="flex items-center justify-between">
          <div className="mr-3">
            <Image
              src={profile}
              alt="avatar"
              width={40}
              height={40}
              placeholder="blur"
              className="h-10 w-10 rounded-full"
            />
          </div>
          <div className="h-6 text-base font-semibold sm:text-2xl">
            <span className="font-mono text-green-600 dark:text-green-400">
              $
            </span>{' '}
            <span className="hidden sm:inline">{SiteConfig.title}</span>
          </div>
        </div>
      </Link>
    </div>
  )
})

const LayoutWrapper = ({children}: {children: ReactNode}) => {
  const pathname = usePathname()
  const containerClass = pathname === '/' ? 'xl:max-w-7xl' : 'xl:max-w-5xl'

  return (
    <SectionContainer className={containerClass}>
      <div className="flex min-h-screen flex-col justify-between">
        <header className="sticky top-0 z-40 flex items-center justify-between bg-white/90 py-6 backdrop-blur-none dark:bg-gray-800/90">
          <HeaderLogo />
          <div className="flex items-center text-base leading-5">
            <HeaderNav />
            <DynamicThemeSwitch />
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
