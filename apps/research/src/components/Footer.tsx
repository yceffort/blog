import {Footer as SharedFooter} from '@yceffort/shared/components'
import Link from 'next/link'

import * as footerStyles from '@/components/Footer.styles'
import {socialIconClassNames} from '@/components/icons/SocialIcon.styles'
import {SiteConfig} from '@/config'

export default function Footer() {
  return (
    <SharedFooter
      author={SiteConfig.author}
      siteUrl={SiteConfig.url}
      classNames={footerStyles}
      socialIconClassNames={socialIconClassNames}
    >
      <div className={footerStyles.line}>
        <a href="https://yceffort.kr" target="_blank" rel="noopener noreferrer">
          blog
        </a>
        <div>{` • `}</div>
        <Link
          href="/feed.xml"
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
        >
          rss
        </Link>
      </div>
    </SharedFooter>
  )
}
