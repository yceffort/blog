import * as styles from '@/components/Footer.styles'
import {SiteConfig} from '@/config'

const YEAR = new Date().getFullYear()

function Sep() {
  return (
    <span className={styles.sep} aria-hidden="true">
      /
    </span>
  )
}

export default function Footer() {
  return (
    <footer>
      <div className={styles.inner}>
        <div className={styles.line}>
          <span>{SiteConfig.author.name}</span>
          <Sep />
          <span>{`© ${YEAR}`}</span>
          <Sep />
          <a
            className={styles.link}
            href={`mailto:${SiteConfig.author.contacts.email}`}
          >
            mail
          </a>
          <Sep />
          <a
            className={styles.link}
            href={SiteConfig.author.contacts.github}
            target="_blank"
            rel="noopener noreferrer"
          >
            github
          </a>
          <Sep />
          <a
            className={styles.link}
            href={SiteConfig.author.contacts.twitter}
            target="_blank"
            rel="noopener noreferrer"
          >
            twitter
          </a>
        </div>
        <div className={styles.line}>
          <a
            className={styles.link}
            href="https://yceffort.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            blog
          </a>
          <Sep />
          <a
            className={styles.link}
            href="https://research.yceffort.kr"
            target="_blank"
            rel="noopener noreferrer"
          >
            research
          </a>
        </div>
        <p className={styles.line}>
          이 사이트의 모든 내용은 블로그 주인의 취향에 따라 AI로 생성되었습니다.
        </p>
      </div>
    </footer>
  )
}
