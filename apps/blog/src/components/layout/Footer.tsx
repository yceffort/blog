import * as stylex from '@stylexjs/stylex'
import {Footer as SharedFooter} from '@yceffort/shared/components'

import {socialIconClassNames} from '@/components/icons/SocialIcon.styles'
import {SiteConfig} from '@/config'

const sx = stylex.create({
  div: {
    '@layer utilities': {
      marginTop: 'calc(var(--spacing) * 16)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
  },
  div2: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 3)',
      display: 'flex',
    },
  },
  div3: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 2)',
      display: 'flex',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--blog-leading, var(--text-sm--line-height))',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
    },
  },
})
// social-links, compact-stack은 styles/spacing.css가 자식 사이 간격을 줄 때 쓴다
const classNames = {
  root: stylex.props(sx.div).className ?? '',
  icons: `social-links ${stylex.props(sx.div2).className}`,
  line: `compact-stack ${stylex.props(sx.div3).className}`,
}
export default function Footer() {
  return (
    <SharedFooter
      author={SiteConfig.author}
      siteUrl={SiteConfig.url}
      classNames={classNames}
      socialIconClassNames={socialIconClassNames}
    />
  )
}
