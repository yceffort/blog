import type {Metadata} from 'next'

import {OfflineLibrary} from '@/components/offline/OfflineLibrary'

export const metadata: Metadata = {
  title: 'Offline',
  robots: {index: false, follow: false},
}

export default function OfflinePage() {
  return <OfflineLibrary />
}
