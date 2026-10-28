'use client'

import * as stylex from '@stylexjs/stylex'
import {SiteHeader} from '@yceffort/shared/components'
import {usePathname} from 'next/navigation'
import {ViewTransition, type ReactNode} from 'react'

import {SiteConfig} from '@/config'
import {useIsStandalone} from '@/hooks/useIsStandalone'
import {useLocale} from '@/hooks/useLocale'
import profile from '@/public/profile.jpeg'
import {skipLink} from '@/styles/accessibility.styles'

import SiteSearch from '../search/SiteSearch'
import BlogTweaks from '../settings/BlogTweaks'
import Footer from './Footer'
import LanguageSwitch from './LanguageSwitch'
import ScrollTop from './ScrollTop'
import SectionContainer from './SectionContainer'
const sx = stylex.create({
  containerClass: {
    '@layer utilities': {
      maxWidth: {
        default: null,
        '@media (width >= 80rem)': 'var(--container-5xl)',
      },
    },
  },
  container: {
    '@layer utilities': {
      maxWidth: {
        default: null,
        '@media (width >= 80rem)': 'var(--container-7xl)',
      },
    },
  },
  container2: {
    '@layer utilities': {
      maxWidth: 'var(--container-6xl)',
    },
  },
  main: {
    '@layer utilities': {
      minHeight: 'calc(100vh - 260px)',
      paddingTop: 'calc(var(--spacing) * 6)',
    },
  },
})
function Header({enSlugs}: {enSlugs: string[]}) {
  const {pathPrefix} = useLocale()
  const standalone = useIsStandalone()
  const baseMenu = pathPrefix
    ? SiteConfig.menu.map((link) =>
        // 영문판이 있는 메뉴만 /en으로 보낸다
        ['/pages/1', '/about', '/series', '/tags'].includes(link.path)
          ? {
              ...link,
              path: `${pathPrefix}${link.path}`,
            }
          : link,
      )
    : SiteConfig.menu
  const menu = standalone
    ? [...baseMenu, {label: 'Saved', path: `${pathPrefix}/saved`}]
    : baseMenu
  return (
    <SiteHeader
      homeHref={pathPrefix || '/'}
      homeLabel="yceffort's blog"
      profile={profile}
      menu={menu}
      actions={<SiteSearch />}
      trailing={<LanguageSwitch enSlugs={enSlugs} />}
      tweaks={<BlogTweaks />}
    />
  )
}
const LayoutWrapper = ({
  children,
  enSlugs,
}: {
  children: ReactNode
  enSlugs: string[]
}) => {
  const pathname = usePathname()
  const isEn = useLocale().locale === 'en'
  // 영문 경로도 같은 폭을 쓰도록 /en 접두사를 떼고 고른다
  const path = pathname === '/en' ? '/' : pathname?.replace(/^\/en(?=\/.)/, '')
  const containerClass = stylex.props(
    path === '/about'
      ? sx.container2
      : path === '/' ||
          path === '/series' ||
          path?.startsWith('/pages') ||
          path?.startsWith('/tags')
        ? sx.container
        : sx.containerClass,
  ).className
  return (
    <>
      <a href="#main" className={`skip-link ${skipLink}`}>
        {isEn ? 'Skip to content' : '본문으로 건너뛰기'}
      </a>
      <Header enSlugs={enSlugs} />
      <SectionContainer className={containerClass}>
        {/* React는 root 전환을 취소하므로 본문을 경계로 감싸 page 클래스로 슬라이드한다 */}
        <ViewTransition default="page">
          <main id="main" className={stylex.props(sx.main).className}>
            {children}
          </main>
        </ViewTransition>
        <Footer />
      </SectionContainer>
      <ScrollTop />
    </>
  )
}
export default LayoutWrapper
