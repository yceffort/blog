import * as stylex from '@stylexjs/stylex'
import type {ReactNode} from 'react'
const sx = stylex.create({
  baseClass: {
    '@layer utilities': {
      marginInline: 'auto',
      maxWidth: {
        default: 'var(--container-3xl)',
        '@media (width >= 64rem)': 'var(--container-5xl)',
      },
      paddingInline: {
        default: 'calc(var(--spacing) * 4)',
        '@media (width >= 40rem)': 'calc(var(--spacing) * 6)',
        '@media (width >= 64rem)': 'calc(var(--spacing) * 8)',
      },
    },
  },
})
export default function SectionContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const baseClass = stylex.props(sx.baseClass).className
  return (
    <div className={className ? `${baseClass} ${className}` : baseClass}>
      {children}
    </div>
  )
}
