import Link from 'next/link'

import * as notFoundStyles from './not-found.styles'
export default function NotFound() {
  return (
    <div className={`not-found-layout ${notFoundStyles.div}`}>
      <div className={`compact-stack not-found-heading ${notFoundStyles.div2}`}>
        <h1 className={notFoundStyles.h1}>404</h1>
      </div>
      <div className={notFoundStyles.div3}>
        <p className={notFoundStyles.p}>
          Sorry we couldn&apos;t find this page.
        </p>
        <p className={notFoundStyles.p2}>
          But don&apos;t worry, you can find plenty of other things on my blog
          👀
        </p>
        <Link href="/">
          <button className={notFoundStyles.button}>Back to blog</button>
        </Link>
      </div>
    </div>
  )
}
