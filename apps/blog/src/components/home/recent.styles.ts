import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  series_row: {
    '@layer site': {
      paddingLeft: '36px',
    },
  },
  rec_list: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border)',
    },
  },
  rec_row: {
    '@layer site': {
      position: 'relative',
      display: 'grid',
      alignItems: 'center',
      padding: '20px 12px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      transition: 'background 200ms',
      cursor: 'pointer',
      gridTemplateColumns: {
        default: '56px 1.2fr 1fr 130px 28px',
        '@media (max-width: 900px)': '40px 1fr 24px',
      },
      gap: '20px',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface) 50%, transparent)',
        },
      },
      backgroundImage: {
        default: null,
        ':hover': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'none',
        },
      },
      backgroundPosition: {
        default: null,
        ':hover': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'initial',
        },
      },
      backgroundSize: {
        default: null,
        ':hover': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'auto',
        },
      },
      backgroundRepeat: {
        default: null,
        ':hover': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'repeat',
        },
      },
      backgroundOrigin: {
        default: null,
        ':hover': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'padding-box',
        },
      },
      backgroundClip: {
        default: null,
        ':hover': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'border-box',
        },
      },
      backgroundAttachment: {
        default: null,
        ':hover': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'scroll',
        },
      },
    },
  },
  rn: {
    '@layer site': {
      fontFamily: {
        default: null,
        ':is(.rec-row .rn)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.rec-row .rn)': '12px',
      },
      letterSpacing: {
        default: null,
        ':is(.rec-row .rn)': '0.1em',
      },
      color: {
        default: null,
        ':is(.rec-row .rn)': 'var(--ink-4)',
      },
    },
  },
  element_h4: {
    '@layer site': {
      overflow: {
        default: null,
        ':is(.rec-row h4)': 'hidden',
      },
      display: {
        default: null,
        ':is(.rec-row h4)': '-webkit-box',
      },
      fontSize: {
        default: null,
        ':is(.rec-row h4)': '16px',
      },
      fontWeight: {
        default: null,
        ':is(.rec-row h4)': '700',
      },
      lineHeight: {
        default: null,
        ':is(.rec-row h4)': '1.4',
      },
      letterSpacing: {
        default: null,
        ':is(.rec-row h4)': '-0.01em',
      },
      color: {
        default: null,
        ':is(.rec-row h4)': 'var(--ink)',
      },
      WebkitLineClamp: {
        default: null,
        ':is(.rec-row h4)': '2',
      },
      WebkitBoxOrient: {
        default: null,
        ':is(.rec-row h4)': 'vertical',
      },
    },
  },
  rtags: {
    '@layer site': {
      display: {
        default: null,
        ':is(.rec-row .rtags)': 'flex',
      },
      flexWrap: {
        default: null,
        ':is(.rec-row .rtags)': 'wrap',
      },
      marginTop: {
        default: null,
        ':is(.rec-row .rtags)': '6px',
      },
      fontFamily: {
        default: null,
        ':is(.rec-row .rtags)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.rec-row .rtags)': '10.5px',
      },
      letterSpacing: {
        default: null,
        ':is(.rec-row .rtags)': '0.08em',
      },
      textTransform: {
        default: null,
        ':is(.rec-row .rtags)': 'uppercase',
      },
      color: {
        default: null,
        ':is(.rec-row .rtags)': 'var(--ink-3)',
      },
      gap: {
        default: null,
        ':is(.rec-row .rtags)': '4px',
      },
    },
  },
  rd: {
    '@layer site': {
      overflow: {
        default: null,
        ':is(.rec-row .rd)': 'hidden',
      },
      display: {
        default: null,
        ':is(.rec-row .rd)': '-webkit-box',
        '@media (max-width: 900px)': {
          default: null,
          ':is(.rec-row .rd)': 'none',
        },
      },
      fontSize: {
        default: null,
        ':is(.rec-row .rd)': '13px',
      },
      lineHeight: {
        default: null,
        ':is(.rec-row .rd)': '1.55',
      },
      color: {
        default: null,
        ':is(.rec-row .rd)': 'var(--ink-3)',
      },
      WebkitLineClamp: {
        default: null,
        ':is(.rec-row .rd)': '2',
      },
      WebkitBoxOrient: {
        default: null,
        ':is(.rec-row .rd)': 'vertical',
      },
    },
  },
  rmeta: {
    '@layer site': {
      fontFamily: {
        default: null,
        ':is(.rec-row .rmeta)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.rec-row .rmeta)': '11px',
      },
      letterSpacing: {
        default: null,
        ':is(.rec-row .rmeta)': '0.05em',
      },
      textAlign: {
        default: null,
        ':is(.rec-row .rmeta)': 'right',
      },
      color: {
        default: null,
        ':is(.rec-row .rmeta)': 'var(--ink-3)',
      },
      display: {
        default: null,
        '@media (max-width: 900px)': {
          default: null,
          ':is(.rec-row .rmeta)': 'none',
        },
      },
    },
  },
  element_b: {
    '@layer site': {
      display: {
        default: null,
        ':is(.rec-row .rmeta b)': 'block',
      },
      marginBottom: {
        default: null,
        ':is(.rec-row .rmeta b)': '2px',
      },
      fontSize: {
        default: null,
        ':is(.rec-row .rmeta b)': '12px',
      },
      fontWeight: {
        default: null,
        ':is(.rec-row .rmeta b)': '600',
      },
      color: {
        default: null,
        ':is(.rec-row .rmeta b)': 'var(--ink-2)',
      },
    },
  },
  rarrow: {
    '@layer site': {
      color: {
        default: null,
        ':is(.rec-row .rarrow)': 'var(--ink-3)',
        ':is(.rec-row:hover .rarrow)': 'var(--primary)',
      },
      transition: {
        default: null,
        ':is(.rec-row .rarrow)':
          'transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1),\n    color 180ms',
      },
      transform: {
        default: null,
        ':is(.rec-row:hover .rarrow)': 'translateX(4px)',
      },
    },
  },
  element_a: {
    '@layer site': {
      position: {
        default: null,
        ':is(.rec-row > a)': 'absolute',
      },
      inset: {
        default: null,
        ':is(.rec-row > a)': '0',
      },
      zIndex: {
        default: null,
        ':is(.rec-row > a)': '3',
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const rec_list = stylex.props(styles.rec_list).className!
export const rec_row = stylex.props(styles.rec_row).className!
export const series_row = stylex.props(
  styles.rec_row,
  styles.series_row,
).className!
export const rn = stylex.props(styles.rn).className!
export const element_h4 = stylex.props(styles.element_h4).className!
export const rtags = stylex.props(styles.rtags).className!
export const rd = stylex.props(styles.rd).className!
export const rmeta = stylex.props(styles.rmeta).className!
export const element_b = stylex.props(styles.element_b).className!
export const rarrow = stylex.props(styles.rarrow).className!
export const element_a = stylex.props(styles.element_a).className!
