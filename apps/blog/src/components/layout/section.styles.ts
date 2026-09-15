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
      display: 'block',
      marginBottom: '6px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
    },
  },
  element_h2: {
    '@layer site': {
      fontSize: 'clamp(28px, 4vw, 48px)',
      fontWeight: '900',
      lineHeight: '1.05',
      letterSpacing: '-0.03em',
      color: 'var(--ink)',
    },
  },
  element_em: {
    '@layer site': {
      fontFamily: 'var(--font-serif), serif',
      fontStyle: 'italic',
      fontWeight: '500',
      color: 'var(--ink-3)',
    },
  },
  line: {
    '@layer site': {
      flex: '1',
      height: '1px',
      marginBottom: '18px',
      backgroundColor: 'transparent',
      backgroundImage: {
        default:
          'linear-gradient(\n    90deg,\n    var(--border-2),\n    var(--border)\n  )',
        '@supports (color: color-mix(in lab, red, red))':
          'linear-gradient(\n    90deg,\n    var(--border-2),\n    color-mix(in oklab, var(--border) 30%, transparent)\n  )',
      },
    },
  },
  hint: {
    '@layer site': {
      marginBottom: '18px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      color: 'var(--ink-4)',
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
