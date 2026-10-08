import type {Metadata} from 'next'

import HomeView from '@/components/home/HomeView'
import {SiteConfig} from '@/config'
export const metadata: Metadata = {
  title: `${SiteConfig.title} — English`,
  description: SiteConfig.subtitle,
  openGraph: {
    title: `${SiteConfig.title} — English`,
    description: SiteConfig.subtitle,
    url: `${SiteConfig.url}/en`,
  },
}
export default function EnPage() {
  return <HomeView locale="en" />
}
