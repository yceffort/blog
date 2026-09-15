import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  container: {
    '@layer site': {
      marginInline: 'auto',
      maxWidth: {
        default: '48rem',
        '@media (width >= 64rem)': '64rem',
      },
      paddingInline: {
        default: '1rem',
        '@media (width >= 40rem)': '1.5rem',
        '@media (width >= 64rem)': '2rem',
      },
    },
  },
  home: {
    '@layer site': {
      maxWidth: {
        default: '48rem',
        '@media (width >= 64rem)': '64rem',
        '@media (width >= 80rem)': '80rem',
      },
    },
  },
  page: {
    '@layer site': {
      maxWidth: {
        default: '48rem',
        '@media (width >= 64rem)': '64rem',
        '@media (width >= 80rem)': '64rem',
      },
    },
  },
})

export type SectionVariant = 'home' | 'page'

// 한 번의 props 호출로 합성해 StyleX가 승자를 결정하게 한다.
export const sectionContainer = {
  home: stylex.props(sx.container, sx.home).className ?? '',
  page: stylex.props(sx.container, sx.page).className ?? '',
}
