import {AboutTabs} from '@/components/about/AboutTabs'
import {Resume} from '@/components/about/Resume'
import {SiteConfig} from '@/config'

import styles from '@/components/about/Resume.module.scss'

export default function Page() {
  return (
    <div className="page-view">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>FRONTEND ENGINEER · WRITER</p>
          <h1>
            {SiteConfig.author.name}
            <span>.</span>
          </h1>
          <p className={styles.headerNote}>
            만들고 운영하며 쌓아 온 경험을 기록합니다.
          </p>
        </div>
        <div className={styles.contacts}>
          <a href={`mailto:${SiteConfig.author.contacts.email}`}>
            {SiteConfig.author.contacts.email} <span aria-hidden="true">↗</span>
          </a>
          <a href={SiteConfig.author.contacts.github}>
            GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <AboutTabs active="resume" />

      <div className="mt-4">
        <Resume />
      </div>
    </div>
  )
}
