import type {ReactNode} from 'react'

import {pageMetadata} from '@/components/about/pageMetadata'

export const metadata = pageMetadata('about', 'ko')

export default function Layout({children}: {children: ReactNode}) {
  return <>{children}</>
}
