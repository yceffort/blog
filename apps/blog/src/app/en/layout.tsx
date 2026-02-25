import type {Metadata} from 'next'
import type {ReactNode} from 'react'

import SetHtmlLang from '#components/SetHtmlLang'

export const metadata: Metadata = {
  openGraph: {
    locale: 'en_US',
  },
  alternates: {
    types: {
      'application/rss+xml': '/en/feed.xml',
    },
  },
}

export default function EnLayout({children}: {children: ReactNode}) {
  return (
    <>
      <SetHtmlLang lang="en" />
      {children}
    </>
  )
}
