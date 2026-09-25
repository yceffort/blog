import * as stylex from '@stylexjs/stylex'

import {AboutHero} from '@/components/about/AboutHero'
import {AboutIntro} from '@/components/about/AboutIntro'
import {AboutTabs} from '@/components/about/AboutTabs'
import * as ambientStyles from '@/components/layout/ambient.styles'
import type {Locale} from '@/utils/postPaths'
const sx = stylex.create({
  div: {
    '@layer utilities': {
      marginTop: 'calc(var(--spacing) * 4)',
    },
  },
})
export function AboutPageView({locale}: {locale: Locale}) {
  return (
    <div className={`page-view ${ambientStyles.page_view}`}>
      <AboutHero />

      <AboutTabs active="about" locale={locale} />

      <div className={stylex.props(sx.div).className}>
        <AboutIntro locale={locale} />
      </div>
    </div>
  )
}
