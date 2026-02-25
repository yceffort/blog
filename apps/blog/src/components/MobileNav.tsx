'use client'

import {MobileNav as SharedMobileNav} from '@yceffort/shared/components'

import {SiteConfig} from '#src/config'
import {useLocale} from '#src/hooks/useLocale'

export default function MobileNav() {
  const {pathPrefix} = useLocale()
  const menu = pathPrefix
    ? SiteConfig.menu.map((link) =>
        link.path === '/pages/1' ? {...link, path: `${pathPrefix}/pages/1`} : link,
      )
    : SiteConfig.menu

  return <SharedMobileNav menu={menu} />
}
