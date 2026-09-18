import Link from 'next/link'

import * as footerStyles from '@/components/Footer.styles'
import SocialIcon from '@/components/icons'
import {SiteConfig} from '@/config'

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer>
      <div className={footerStyles.inner}>
        <div className={footerStyles.icons}>
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
        <div className={footerStyles.line}>
          <div>{SiteConfig.author.name}</div>
          <div>{` • `}</div>
          <div>{`© ${YEAR}`}</div>
          <div>{` • `}</div>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            {SiteConfig.url}
          </Link>
        </div>
        <div className={footerStyles.line}>
          <a
            href="https://yceffort.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
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
      </div>
    </footer>
  )
}
