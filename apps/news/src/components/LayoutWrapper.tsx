'use client'

import {SiteHeader} from '@yceffort/shared/components'
import type {ReactNode} from 'react'

import Footer from '@/components/Footer'
import * as styles from '@/components/LayoutWrapper.styles'
import SectionContainer from '@/components/SectionContainer'
import {SiteConfig} from '@/config'
import profile from '@/public/profile.png'

function Header() {
  return (
    <SiteHeader
      homeLabel={SiteConfig.title}
      profile={profile}
      badge="news"
      menu={SiteConfig.menu}
    />
  )
}

export default function LayoutWrapper({children}: {children: ReactNode}) {
  return (
    <>
      <Header />
      <SectionContainer>
        <main className={styles.main}>{children}</main>
        <Footer />
      </SectionContainer>
    </>
  )
}
