import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  archive_head: {
    '@layer site': {
      marginBottom: '32px',
    },
  },
  element_h1: {
    '@layer site': {
      marginTop: {
        default: null,
        ':is(.archive-head h1)': '8px',
      },
      fontSize: {
        default: null,
        ':is(.archive-head h1)': '32px',
      },
      fontWeight: {
        default: null,
        ':is(.archive-head h1)': '800',
      },
      letterSpacing: {
        default: null,
        ':is(.archive-head h1)': '-0.02em',
      },
      color: {
        default: null,
        ':is(.archive-head h1)': 'var(--ink)',
      },
    },
  },
  archive_sub: {
    '@layer site': {
      marginTop: '6px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '13px',
      color: 'var(--ink-3)',
    },
  },
  archive_year: {
    '@layer site': {
      marginBottom: '36px',
      scrollMarginTop: '90px',
    },
  },
  archive_year_head: {
    '@layer site': {
      display: 'flex',
      alignItems: 'baseline',
      marginBottom: '8px',
      paddingBottom: '8px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      gap: '10px',
    },
  },
  element_h2: {
    '@layer site': {
      fontSize: {
        default: null,
        ':is(.archive-year-head h2)': '22px',
      },
      fontWeight: {
        default: null,
        ':is(.archive-year-head h2)': '700',
      },
      color: {
        default: null,
        ':is(.archive-year-head h2)': 'var(--ink)',
      },
    },
  },
  element_span: {
    '@layer site': {
      fontFamily: {
        default: null,
        ':is(.archive-year-head span)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.archive-year-head span)': '12px',
      },
      color: {
        default: null,
        ':is(.archive-year-head span)': 'var(--ink-4)',
      },
    },
  },
  archive_list: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
    },
  },
  archive_item: {
    '@layer site': {
      display: 'flex',
      alignItems: 'baseline',
      padding: '7px 8px',
      borderRadius: '8px',
      transition: 'background-color 140ms ease,\n    color 140ms ease',
      gap: '14px',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface) 60%, transparent)',
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
  archive_date: {
    '@layer site': {
      flexShrink: '0',
      width: '44px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '12px',
      color: 'var(--ink-4)',
    },
  },
  archive_title: {
    '@layer site': {
      fontSize: '14.5px',
      lineHeight: '1.5',
      color: {
        default: 'var(--ink-2)',
        ':is(.archive-item:hover .archive-title)': 'var(--primary)',
      },
    },
  },
  element_canvas: {
    '@layer site': {
      display: {
        default: null,
        '@media (prefers-reduced-motion: reduce)': {
          default: null,
          ':is(.hero-fx-canvas canvas)': 'none',
          ':is(.hero-fx-b canvas)': 'none',
        },
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const archive_head = stylex.props(styles.archive_head).className!
export const element_h1 = stylex.props(styles.element_h1).className!
export const archive_sub = stylex.props(styles.archive_sub).className!
export const archive_year = stylex.props(styles.archive_year).className!
export const archive_year_head = stylex.props(
  styles.archive_year_head,
).className!
export const element_h2 = stylex.props(styles.element_h2).className!
export const element_span = stylex.props(styles.element_span).className!
export const archive_list = stylex.props(styles.archive_list).className!
export const archive_item = stylex.props(styles.archive_item).className!
export const archive_date = stylex.props(styles.archive_date).className!
export const archive_title = stylex.props(styles.archive_title).className!
export const element_canvas = stylex.props(styles.element_canvas).className!
