import * as stylex from '@stylexjs/stylex'

import {AboutTabs} from '@/components/about/AboutTabs'
import {Resume} from '@/components/about/Resume'
import * as resumeStyles from '@/components/about/Resume.styles'
import * as ambientStyles from '@/components/layout/ambient.styles'
import {SiteConfig} from '@/config'

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
      <header
        className={`resume-pageHeader ${resumeStyles.resume_pageHeader} ${resumeStyles.resume_pageHeader}`}
      >
        <div>
          <p
            className={`resume-eyebrow ${resumeStyles.resume_eyebrow} ${resumeStyles.resume_eyebrow}`}
          >
            FRONTEND ENGINEER · WRITER
          </p>
          <h1 className={resumeStyles.element_h1}>
            {SiteConfig.author.name}
            <span className={resumeStyles.resume_pageHeader_span}>.</span>
          </h1>
          <p
            className={`resume-headerNote ${resumeStyles.resume_headerNote} ${resumeStyles.resume_headerNote}`}
          >
            만들고 운영하며 쌓아 온 경험을 기록합니다.
          </p>
        </div>
        <div
          className={`resume-contacts ${resumeStyles.resume_contacts} ${resumeStyles.resume_contacts}`}
        >
          <a
            href={`mailto:${SiteConfig.author.contacts.email}`}
            className={resumeStyles.resume_link_hover}
          >
            {SiteConfig.author.contacts.email} <span aria-hidden="true">↗</span>
          </a>
          <a
            href={SiteConfig.author.contacts.github}
            className={resumeStyles.resume_link_hover}
          >
            {'GitHub '}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <AboutTabs active="resume" />

      <div className={stylex.props(sx.div).className}>
        <Resume />
      </div>
    </div>
  )
}
