import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  description: {
    '@layer site': {
      maxWidth: 'none',
      fontSize: '16px',
      lineHeight: '1.6',
      color: 'var(--ink-2)',
      textWrap: 'pretty',
      wordBreak: 'keep-all',
    },
  },
})

export const description = stylex.props(styles.description).className!
