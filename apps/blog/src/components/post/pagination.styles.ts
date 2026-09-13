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
      justifyContent: {
        default: null,
        ':is(.pagination-slot.end)': 'flex-end',
      },
    },
  },
  pagination_link: {
    '@layer site': {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '10px 14px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderRadius: '8px',
      backgroundColor: 'var(--surface)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
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
export const pagination_link = stylex.props(styles.pagination_link).className!
