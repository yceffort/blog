import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  pagination: {
    '@layer site': {
      display: 'flex',
      marginTop: '48px',
      paddingTop: '24px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border)',
    },
  },
  pagination_slot: {
    '@layer site': {
      display: 'flex',
      width: '50%',
    },
  },
  pagination_slot_end: {
    '@layer site': {
      justifyContent: 'flex-end',
    },
  },
  pagination_link: {
    '@layer site': {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '10px 14px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderRadius: '8px',
      backgroundColor: 'var(--surface)',
      fontSize: '14px',
      fontWeight: '500',
      color: {
        default: 'var(--ink-2)',
        ':hover': 'var(--ink)',
      },
      transition: 'all 200ms',
      gap: '10px',
      boxShadow: {
        default: null,
        ':hover': '0 8px 24px -16px var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover':
            '0 8px 24px -16px color-mix(in oklab, var(--primary) 80%, transparent)',
        },
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const pagination = stylex.props(styles.pagination).className!
export const pagination_slot = stylex.props(styles.pagination_slot).className!
export const pagination_slot_end = stylex.props(
  styles.pagination_slot_end,
).className!
export const pagination_link = stylex.props(styles.pagination_link).className!
