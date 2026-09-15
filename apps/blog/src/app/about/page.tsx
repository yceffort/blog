import * as stylex from '@stylexjs/stylex'

import {AboutHero} from '@/components/about/AboutHero'
import {AboutIntro} from '@/components/about/AboutIntro'
import {AboutTabs} from '@/components/about/AboutTabs'
import * as ambientStyles from '@/components/layout/ambient.styles'
const sx = stylex.create({
  div: {
    '@layer utilities': {
      marginTop: 'calc(var(--spacing) * 4)',
    },
  },
})
export default function Page() {
  return (
    <div className={`page-view ${ambientStyles.page_view}`}>
      <AboutHero />

      <AboutTabs active="about" />

      <div className={stylex.props(sx.div).className}>
        <AboutIntro />
      </div>
    </div>
  )
}
