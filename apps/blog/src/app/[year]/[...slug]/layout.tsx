import * as stylex from '@stylexjs/stylex'
import type {ReactNode} from 'react'
const sx = stylex.create({
  div: {
    '@layer utilities': {
      marginInline: 'auto',
      maxWidth: {
        default: 'var(--container-3xl)',
        '@media (width >= 80rem)': 'var(--container-5xl)',
      },
      paddingInline: {
        default: 'calc(var(--spacing) * 4)',
        '@media (width >= 40rem)': 'calc(var(--spacing) * 6)',
        '@media (width >= 80rem)': '0px',
      },
    },
  },
})
export default function Layout({children}: {children: ReactNode}) {
  return <div className={stylex.props(sx.div).className}>{children}</div>
}
