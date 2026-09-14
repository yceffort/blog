import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  floating_toc: {
    '@layer site': {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      zIndex: '50',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  },
  floating_toc_panel: {
    '@layer site': {
      overflowY: 'auto',
      position: 'absolute',
      right: '0',
      bottom: '64px',
      width: '288px',
      maxHeight: '60vh',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border)',
      borderRadius: '12px',
      boxShadow: '0 20px 50px -20px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      transform: {
        default: 'translateY(16px) scale(0.9)',
        ':is([data-open="true"])': 'none',
      },
      transformOrigin: 'bottom right',
      transition:
        'transform 240ms cubic-bezier(0.16, 1, 0.3, 1),\n    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: {
        default: '0',
        ':is([data-open="true"])': '1',
      },
      pointerEvents: {
        default: 'none',
        ':is([data-open="true"])': 'auto',
      },
      willChange: 'transform, opacity',
    },
  },
  floating_toc_header: {
    '@layer site': {
      position: 'sticky',
      top: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      backgroundColor: 'var(--surface)',
    },
  },
  element_h2: {
    '@layer site': {
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
    },
  },
  floating_toc_close: {
    '@layer site': {
      display: 'grid',
      width: '24px',
      height: '24px',
      marginRight: '-4px',
      borderRadius: '6px',
      color: {
        default: 'var(--ink-4)',
        ':hover': 'var(--ink)',
      },
      transition: 'background 160ms,\n    color 160ms',
      cursor: 'pointer',
      placeItems: 'center',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface-2)',
      },
      backgroundImage: {
        default: null,
        ':hover': 'none',
      },
      backgroundPosition: {
        default: null,
        ':hover': 'initial',
      },
      backgroundSize: {
        default: null,
        ':hover': 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':hover': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':hover': 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':hover': 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':hover': 'scroll',
      },
    },
  },
  floating_toc_list: {
    '@layer site': {
      padding: '8px 16px 16px',
    },
  },
  element_ul: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      fontSize: '13px',
      listStyle: 'none',
    },
  },
  element_a: {
    '@layer site': {
      display: 'block',
      padding: '6px 0 6px 12px',
      borderLeftWidth: '2px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'transparent',
        ':hover': 'var(--border-2)',
        ':is([data-active="true"])': 'var(--primary)',
      },
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
        ':is([data-active="true"])': 'var(--primary)',
      },
      transition: 'all 180ms',
      fontWeight: {
        default: null,
        ':is([data-active="true"])': '500',
      },
    },
  },
  floating_toc_scroll_top: {
    '@layer site': {
      display: 'grid',
      width: '40px',
      height: '40px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '50%',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
      },
      transition:
        'border-color 160ms,\n    color 160ms,\n    transform 220ms,\n    opacity 220ms',
      cursor: 'pointer',
      placeItems: 'center',
      pointerEvents: {
        default: null,
        ':is([data-show="false"])': 'none',
      },
      transform: {
        default: null,
        ':is([data-show="false"])': 'translateY(8px)',
      },
      opacity: {
        default: null,
        ':is([data-show="false"])': '0',
      },
    },
  },
  floating_toc_share: {
    '@layer site': {
      display: 'grid',
      width: '40px',
      height: '40px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '50%',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
      },
      transition:
        'border-color 160ms,\n    color 160ms,\n    transform 220ms,\n    opacity 220ms',
      cursor: 'pointer',
      placeItems: 'center',
    },
  },
  floating_toc_toast: {
    '@layer site': {
      position: 'absolute',
      right: '0',
      bottom: '56px',
      padding: '6px 10px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border)',
      borderRadius: '8px',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      color: 'var(--ink-2)',
      transform: {
        default: 'translateY(6px)',
        ':is([data-show="true"])': 'none',
      },
      transition: 'opacity 160ms,\n    transform 160ms',
      opacity: {
        default: '0',
        ':is([data-show="true"])': '1',
      },
      pointerEvents: 'none',
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const floating_toc = stylex.props(styles.floating_toc).className!
export const floating_toc_panel = stylex.props(
  styles.floating_toc_panel,
).className!
export const floating_toc_header = stylex.props(
  styles.floating_toc_header,
).className!
export const element_h2 = stylex.props(styles.element_h2).className!
export const floating_toc_close = stylex.props(
  styles.floating_toc_close,
).className!
export const floating_toc_list = stylex.props(
  styles.floating_toc_list,
).className!
export const element_ul = stylex.props(styles.element_ul).className!
export const element_a = stylex.props(styles.element_a).className!
export const floating_toc_scroll_top = stylex.props(
  styles.floating_toc_scroll_top,
).className!
export const floating_toc_share = stylex.props(
  styles.floating_toc_share,
).className!
export const floating_toc_toast = stylex.props(
  styles.floating_toc_toast,
).className!
