import type {Metadata} from 'next'

import NewsletterConfirm from '@/components/newsletter/NewsletterConfirm'

export const metadata: Metadata = {
  title: '메일 구독 확인',
  robots: {index: false},
}

export default function NewsletterConfirmPage() {
  return (
    <div className="page-view">
      <NewsletterConfirm />
    </div>
  )
}
