import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  main: {
    '@layer site': {
      minHeight: 'calc(100vh - 260px)',
      paddingTop: '1.5rem',
    },
  },
})

export const main = stylex.props(styles.main).className!
