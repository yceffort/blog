import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  inner: {
    '@layer utilities': {
      marginTop: '4rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
  },
  icons: {
    '@layer utilities': {
      marginBottom: '0.75rem',
      display: 'flex',
      gap: '1rem',
    },
  },
  line: {
    '@layer utilities': {
      marginBottom: '0.5rem',
      display: 'flex',
      gap: '0.5rem',
      fontSize: '0.875rem',
      lineHeight: 'calc(1.25 / 0.875)',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':is(.dark *)': 'oklch(70.5% 0.015 286.067)',
      },
    },
  },
})

export const inner = stylex.props(sx.inner).className ?? ''
export const icons = stylex.props(sx.icons).className ?? ''
export const line = stylex.props(sx.line).className ?? ''
