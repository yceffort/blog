import type {ReactNode} from 'react'

export default function SectionContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const baseClass = 'mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-5xl xl:px-0'

  return <div className={`${baseClass} ${className ?? ''}`}>{children}</div>
}
