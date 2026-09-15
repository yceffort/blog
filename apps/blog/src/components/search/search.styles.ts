import * as stylex from '@stylexjs/stylex'
const motion_search_fade = stylex.keyframes({
  from: {
    opacity: '0',
  },
  to: {
    opacity: '1',
  },
})
const styles = stylex.create({
  search_overlay: {
    '@layer site': {
      position: 'fixed',
      inset: '0',
      zIndex: '90',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '12vh 20px 20px',
      backgroundColor: {
        default: 'var(--bg)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--bg) 55%, transparent)',
      },
      WebkitBackdropFilter: 'blur(8px)',
      backdropFilter: 'blur(8px)',
      animationName: motion_search_fade,
      animationDuration: '160ms',
      animationTimingFunction: 'ease',
      animationDelay: '0s',
      animationIterationCount: '1',
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running',
    },
  },
  search_panel: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: '600px',
      maxHeight: '70vh',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border-2)',
      borderRadius: '16px',
      boxShadow: {
        default: '0 24px 60px -20px var(--ink)',
        '@supports (color: color-mix(in lab, red, red))':
          '0 24px 60px -20px color-mix(in oklab, var(--ink) 50%, transparent)',
      },
      backgroundColor: 'var(--surface)',
    },
  },
  search_input_row: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      padding: '14px 16px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      color: 'var(--ink-3)',
      gap: '10px',
    },
  },
  search_input: {
    '@layer site': {
      flex: '1',
      minWidth: '0',
      borderWidth: 'medium',
      borderStyle: 'none',
      borderColor: 'currentColor',
      outline: 'none',
      backgroundColor: 'transparent',
      backgroundPosition: '0px 0px',
      fontSize: '16px',
    },
    color: {
      default: null,
      '@layer site': 'var(--ink)',
      '::placeholder': {
        default: null,
        '@layer site': 'var(--ink-4)',
      },
    },
  },
  search_esc: {
    '@layer site': {
      flexShrink: '0',
      padding: '3px 8px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border)',
      borderRadius: '6px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      color: {
        default: 'var(--ink-4)',
        ':hover': 'var(--ink-2)',
      },
    },
  },
  search_results: {
    '@layer site': {
      overflowY: 'auto',
      flex: '1',
      padding: '6px',
    },
  },
  search_hint: {
    '@layer site': {
      padding: '24px 12px',
      fontSize: '14px',
      textAlign: 'center',
      color: 'var(--ink-4)',
    },
  },
  search_result: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      padding: '10px 12px',
      borderRadius: '10px',
      transition: 'background-color 140ms ease',
      gap: '3px',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface-2)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface-2) 80%, transparent)',
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
  search_result_title: {
    '@layer site': {
      fontSize: '14.5px',
      fontWeight: '600',
      color: 'var(--ink)',
    },
  },
  search_result_desc: {
    '@layer site': {
      overflow: 'hidden',
      fontSize: '12.5px',
      lineHeight: '1.45',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      color: 'var(--ink-3)',
    },
  },
  search_result_meta: {
    '@layer site': {
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      color: 'var(--ink-4)',
    },
  },
  search_foot: {
    '@layer site': {
      padding: '10px 16px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border)',
    },
  },
  search_archive_link: {
    '@layer site': {
      fontSize: '12.5px',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--primary)',
      },
      transition: 'color 140ms ease',
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const search_overlay = stylex.props(styles.search_overlay).className!
export const search_panel = stylex.props(styles.search_panel).className!
export const search_input_row = stylex.props(styles.search_input_row).className!
export const search_input = stylex.props(styles.search_input).className!
export const search_esc = stylex.props(styles.search_esc).className!
export const search_results = stylex.props(styles.search_results).className!
export const search_hint = stylex.props(styles.search_hint).className!
export const search_result = stylex.props(styles.search_result).className!
export const search_result_title = stylex.props(
  styles.search_result_title,
).className!
export const search_result_desc = stylex.props(
  styles.search_result_desc,
).className!
export const search_result_meta = stylex.props(
  styles.search_result_meta,
).className!
export const search_foot = stylex.props(styles.search_foot).className!
export const search_archive_link = stylex.props(
  styles.search_archive_link,
).className!
