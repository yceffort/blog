import * as stylex from '@stylexjs/stylex'
import Link from 'next/link'

import SocialIcon from '@/components/icons'
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
const YEAR = new Date().getFullYear()
export default function Footer() {
  return (
    <footer>
      <div className={stylex.props(sx.div).className}>
        <div className={`social-links ${stylex.props(sx.div2).className}`}>
          <SocialIcon
            kind="mail"
            href={`mailto:${SiteConfig.author.contacts.email}`}
            size={6}
          />
          <SocialIcon
            kind="github"
            href={SiteConfig.author.contacts.github}
            size={6}
          />
          <SocialIcon
            kind="twitter"
            href={SiteConfig.author.contacts.twitter}
            size={6}
          />
        </div>
        <div className={`compact-stack ${stylex.props(sx.div3).className}`}>
          <div>{SiteConfig.author.name}</div>
          <div>{' \u2022 '}</div>
          <div>{`© ${YEAR}`}</div>
          <div>{' \u2022 '}</div>
          <Link href="/">{SiteConfig.url}</Link>
        </div>
      </div>
    </footer>
  )
}
