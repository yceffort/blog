import Link from 'next/link'
import type {ReactNode} from 'react'

import SocialIcon, {type SocialIconClassNames} from './SocialIcon'

export interface FooterClassNames {
  root: string
  icons: string
  line: string
}

interface FooterProps {
  author: {
    name: string
    contacts: {email: string; github: string; twitter: string}
  }
  siteUrl: string
  classNames: FooterClassNames
  socialIconClassNames: SocialIconClassNames
  // 이름과 연도 줄 아래에 붙일 앱 고유 줄 (research의 blog, rss 링크 등)
  children?: ReactNode
}

const YEAR = new Date().getFullYear()

export function Footer({
  author,
  siteUrl,
  classNames,
  socialIconClassNames,
  children,
}: FooterProps) {
  return (
    <footer>
      <div className={classNames.root}>
        <div className={classNames.icons}>
          <SocialIcon
            kind="mail"
            href={`mailto:${author.contacts.email}`}
            size={6}
            classNames={socialIconClassNames}
          />
          <SocialIcon
            kind="github"
            href={author.contacts.github}
            size={6}
            classNames={socialIconClassNames}
          />
          <SocialIcon
            kind="twitter"
            href={author.contacts.twitter}
            size={6}
            classNames={socialIconClassNames}
          />
        </div>
        <div className={classNames.line}>
          <div>{author.name}</div>
          <div>{' • '}</div>
          <div>{`© ${YEAR}`}</div>
          <div>{' • '}</div>
          <Link href="/">{siteUrl}</Link>
        </div>
        {children}
      </div>
    </footer>
  )
}
