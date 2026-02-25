import type {Metadata} from 'next'

import ListLayout from '#components/layouts/ListLayout'
import {SiteConfig} from '#src/config'
import {getAllPosts} from '#utils/Post'

export const revalidate = 3600

export const metadata: Metadata = {
  title: `${SiteConfig.title} — English`,
  description: SiteConfig.subtitle,
  openGraph: {
    title: `${SiteConfig.title} — English`,
    description: SiteConfig.subtitle,
    url: `${SiteConfig.url}/en`,
  },
}

export default async function EnPage() {
  const posts = await getAllPosts('en')

  return <ListLayout posts={posts} title="Posts" pathPrefix="/en" />
}
