import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  container: {
    '@layer site': {
      marginInline: 'auto',
      // 블로그 홈과 같은 폭이다(48rem, 64rem, 80rem).
      maxWidth: {
        default: '48rem',
        '@media (width >= 64rem)': '64rem',
        '@media (width >= 80rem)': '80rem',
      },
      paddingInline: {
        default: '1rem',
        '@media (width >= 40rem)': '1.5rem',
        '@media (width >= 64rem)': '2rem',
      },
    },
  },
})

export const sectionContainer = stylex.props(sx.container).className ?? ''
