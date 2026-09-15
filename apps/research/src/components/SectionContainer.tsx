import type {ReactNode} from 'react'

import {
  sectionContainer,
  type SectionVariant,
} from '@/components/SectionContainer.styles'

export default function SectionContainer({
  children,
  variant = 'page',
}: {
  children: ReactNode
  variant?: SectionVariant
}) {
  return <div className={sectionContainer[variant]}>{children}</div>
}
