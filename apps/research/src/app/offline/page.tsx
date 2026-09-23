import type {Metadata} from 'next'

import {OfflineLibrary} from '@/components/offline/OfflineLibrary'

export const metadata: Metadata = {
  title: '저장한 자료 · yceffort research',
  robots: {index: false, follow: false},
}

export default function OfflinePage() {
  return <OfflineLibrary />
}
