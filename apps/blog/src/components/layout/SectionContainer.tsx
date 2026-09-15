import * as stylex from '@stylexjs/stylex'
import type {ReactNode} from 'react'
const sx = stylex.create({
  baseClass: {
    '@layer utilities': {
      marginInline: 'auto',
      width: '95vw',
      maxWidth: 'none',
      paddingInline: {
        default: 'calc(var(--spacing) * 4)',
        '@media (width >= 40rem)': 'calc(var(--spacing) * 6)',
        '@media (width >= 64rem)': 'calc(var(--spacing) * 8)',
      },
    },
  },
  baseClass2: {
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
  wide = false,
}: {
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  const baseClass = wide
    ? stylex.props(sx.baseClass).className
    : stylex.props(sx.baseClass2).className
  return (
    <div className={className ? `${baseClass} ${className}` : baseClass}>
      {children}
    </div>
  )
}
