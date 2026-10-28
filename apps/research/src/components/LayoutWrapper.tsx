'use client'

import {SiteHeader} from '@yceffort/shared/components'
import {usePathname} from 'next/navigation'
import type {ReactNode} from 'react'

import Footer from '@/components/Footer'
import * as styles from '@/components/LayoutWrapper.styles'
import ResearchTweaks from '@/components/ResearchTweaks'
import SectionContainer from '@/components/SectionContainer'
import {SiteConfig} from '@/config'
import profile from '@/public/profile.png'

function Header() {
  return (
    <SiteHeader
      homeLabel={SiteConfig.title}
      profile={profile}
      badge="research"
      menu={SiteConfig.menu}
      tweaks={<ResearchTweaks />}
    />
  )
}

const LayoutWrapper = ({children}: {children: ReactNode}) => {
  const pathname = usePathname()
  const variant = pathname === '/' ? 'home' : 'page'

  return (
    <>
      <Header />
      <SectionContainer variant={variant}>
        <main className={styles.main}>{children}</main>
        <Footer />
      </SectionContainer>
    </>
  )
}

export default LayoutWrapper
