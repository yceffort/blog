'use client'

import {MobileNav as SharedMobileNav} from '@yceffort/shared/components'

import {mobileNavClassNames} from '@/components/layout/MobileNav.styles'
import {SiteConfig} from '@/config'
import {useLocale} from '@/hooks/useLocale'
export default function MobileNav() {
  const {pathPrefix} = useLocale()
  const menu = pathPrefix
    ? SiteConfig.menu.map((link) =>
        // 영문판이 있는 메뉴만 /en으로 보낸다
        link.path === '/pages/1' || link.path === '/about'
          ? {
              ...link,
              path: `${pathPrefix}${link.path}`,
            }
          : link,
      )
    : SiteConfig.menu
  return <SharedMobileNav menu={menu} classNames={mobileNavClassNames} />
}
