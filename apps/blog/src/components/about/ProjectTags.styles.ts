import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  projecttags_tags: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px 12px',
      marginTop: '8px',
      padding: '0',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '12px',
      lineHeight: '1.5',
      color: 'var(--primary)',
      listStyle: 'none',
    },
  },
  element_li: {
    '@layer site': {
      margin: '0',
      padding: '0',
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const projecttags_tags = stylex.props(styles.projecttags_tags).className!
export const element_li = stylex.props(styles.element_li).className!
