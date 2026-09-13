import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  sec_head: {
    '@layer site': {
      display: 'flex',
      alignItems: 'flex-end',
      marginTop: '8px',
      padding: '28px 0 20px',
      gap: '20px',
    },
  },
  sec_count: {
    '@layer site': {
      display: {
        default: null,
        ':is(.sec-head .sec-count)': 'block',
      },
      marginBottom: {
        default: null,
        ':is(.sec-head .sec-count)': '6px',
      },
      fontFamily: {
        default: null,
        ':is(.sec-head .sec-count)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.sec-head .sec-count)': '11px',
      },
      letterSpacing: {
        default: null,
        ':is(.sec-head .sec-count)': '0.15em',
      },
      textTransform: {
        default: null,
        ':is(.sec-head .sec-count)': 'uppercase',
      },
      color: {
        default: null,
        ':is(.sec-head .sec-count)': 'var(--ink-3)',
      },
    },
  },
  element_h2: {
    '@layer site': {
      fontSize: {
        default: null,
        ':is(.sec-head h2)': 'clamp(28px, 4vw, 48px)',
      },
      fontWeight: {
        default: null,
        ':is(.sec-head h2)': '900',
      },
      lineHeight: {
        default: null,
        ':is(.sec-head h2)': '1.05',
      },
      letterSpacing: {
        default: null,
        ':is(.sec-head h2)': '-0.03em',
      },
      color: {
        default: null,
        ':is(.sec-head h2)': 'var(--ink)',
      },
    },
  },
  element_em: {
    '@layer site': {
      fontFamily: {
        default: null,
        ':is(.sec-head h2 em)': 'var(--font-serif), serif',
      },
      fontStyle: {
        default: null,
        ':is(.sec-head h2 em)': 'italic',
      },
      fontWeight: {
        default: null,
        ':is(.sec-head h2 em)': '500',
      },
      color: {
        default: null,
        ':is(.sec-head h2 em)': 'var(--ink-3)',
      },
    },
  },
  line: {
    '@layer site': {
      flex: {
        default: null,
        ':is(.sec-head .line)': '1',
      },
      height: {
        default: null,
        ':is(.sec-head .line)': '1px',
      },
      marginBottom: {
        default: null,
        ':is(.sec-head .line)': '18px',
      },
      backgroundColor: {
        default: null,
        ':is(.sec-head .line)': 'transparent',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)': 'transparent',
        },
      },
      backgroundImage: {
        default: null,
        ':is(.sec-head .line)':
          'linear-gradient(\n    90deg,\n    var(--border-2),\n    var(--border)\n  )',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)':
            'linear-gradient(\n    90deg,\n    var(--border-2),\n    color-mix(in oklab, var(--border) 30%, transparent)\n  )',
        },
      },
      backgroundPosition: {
        default: null,
        ':is(.sec-head .line)': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)': 'initial',
        },
      },
      backgroundSize: {
        default: null,
        ':is(.sec-head .line)': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)': 'auto',
        },
      },
      backgroundRepeat: {
        default: null,
        ':is(.sec-head .line)': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)': 'repeat',
        },
      },
      backgroundOrigin: {
        default: null,
        ':is(.sec-head .line)': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)': 'padding-box',
        },
      },
      backgroundClip: {
        default: null,
        ':is(.sec-head .line)': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)': 'border-box',
        },
      },
      backgroundAttachment: {
        default: null,
        ':is(.sec-head .line)': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.sec-head .line)': 'scroll',
        },
      },
    },
  },
  hint: {
    '@layer site': {
      marginBottom: {
        default: null,
        ':is(.sec-head .hint)': '18px',
      },
      fontFamily: {
        default: null,
        ':is(.sec-head .hint)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.sec-head .hint)': '11px',
      },
      letterSpacing: {
        default: null,
        ':is(.sec-head .hint)': '0.08em',
      },
      textTransform: {
        default: null,
        ':is(.sec-head .hint)': 'uppercase',
      },
      whiteSpace: {
        default: null,
        ':is(.sec-head .hint)': 'nowrap',
      },
      color: {
        default: null,
        ':is(.sec-head .hint)': 'var(--ink-4)',
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const sec_head = stylex.props(styles.sec_head).className!
export const sec_count = stylex.props(styles.sec_count).className!
export const element_h2 = stylex.props(styles.element_h2).className!
export const element_em = stylex.props(styles.element_em).className!
export const line = stylex.props(styles.line).className!
export const hint = stylex.props(styles.hint).className!
