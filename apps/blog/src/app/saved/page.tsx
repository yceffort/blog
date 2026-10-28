import type {Metadata} from 'next'

import {SavedPostsView} from '@/components/pwa/SavedPostsView'

export const metadata: Metadata = {
  title: '저장한 글',
  robots: {index: false},
}

export default function SavedPage() {
  return (
    <div className="page-view">
      <SavedPostsView locale="ko" />
    </div>
  )
}
