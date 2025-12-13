'use client'

import {MobileNav as SharedMobileNav} from '@yceffort/shared/components'

import {SiteConfig} from '#src/config'

export default function MobileNav() {
  return <SharedMobileNav menu={SiteConfig.menu} />
}
