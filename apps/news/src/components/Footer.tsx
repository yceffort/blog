import {Footer as SharedFooter} from '@yceffort/shared/components'

import * as footerStyles from '@/components/Footer.styles'
import {socialIconClassNames} from '@/components/SocialIcon.styles'
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
        <a
          href="https://research.yceffort.kr"
          target="_blank"
          rel="noopener noreferrer"
        >
          research
        </a>
      </div>
      <p className={footerStyles.line}>
        이 사이트의 모든 내용은 블로그 주인의 취향에 따라 AI로 생성되었습니다.
      </p>
    </SharedFooter>
  )
}
