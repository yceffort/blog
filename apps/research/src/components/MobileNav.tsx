'use client'

import {MobileNav as SharedMobileNav} from '@yceffort/shared/components'

import {SiteConfig} from '@/config'

export default function MobileNav() {
  return <SharedMobileNav menu={SiteConfig.menu} />
}
