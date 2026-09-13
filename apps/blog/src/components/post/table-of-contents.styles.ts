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
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border)',
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: 'var(--border)',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: 'var(--border)',
      borderRadius: '12px',
      boxShadow: '0 20px 50px -20px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
      transform: {
        default: 'translateY(16px) scale(0.9)',
        ":is(.floating-toc-panel[data-open='true'])": 'none',
      },
      transformOrigin: 'bottom right',
      transition:
        'transform 240ms cubic-bezier(0.16, 1, 0.3, 1),\n    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: {
        default: '0',
        ":is(.floating-toc-panel[data-open='true'])": '1',
      },
      pointerEvents: {
        default: 'none',
        ":is(.floating-toc-panel[data-open='true'])": 'auto',
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
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
    },
  },
  element_h2: {
    '@layer site': {
      fontFamily: {
        default: null,
        ':is(.floating-toc-header h2)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.floating-toc-header h2)': '11px',
      },
      fontWeight: {
        default: null,
        ':is(.floating-toc-header h2)': '600',
      },
      letterSpacing: {
        default: null,
        ':is(.floating-toc-header h2)': '0.1em',
      },
      textTransform: {
        default: null,
        ':is(.floating-toc-header h2)': 'uppercase',
      },
      color: {
        default: null,
        ':is(.floating-toc-header h2)': 'var(--ink-3)',
      },
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
      display: {
        default: null,
        ':is(.floating-toc-list ul)': 'flex',
      },
      flexDirection: {
        default: null,
        ':is(.floating-toc-list ul)': 'column',
      },
      gap: {
        default: null,
        ':is(.floating-toc-list ul)': '2px',
      },
      fontSize: {
        default: null,
        ':is(.floating-toc-list ul)': '13px',
      },
      listStyle: {
        default: null,
        ':is(.floating-toc-list ul)': 'none',
      },
    },
  },
  element_a: {
    '@layer site': {
      display: {
        default: null,
        ':is(.floating-toc-list a)': 'block',
      },
      padding: {
        default: null,
        ':is(.floating-toc-list a)': '6px 0 6px 12px',
      },
      borderLeftWidth: {
        default: null,
        ':is(.floating-toc-list a)': '2px',
      },
      borderLeftStyle: {
        default: null,
        ':is(.floating-toc-list a)': 'solid',
      },
      borderLeftColor: {
        default: null,
        ':is(.floating-toc-list a)': 'transparent',
        ':is(.floating-toc-list a:hover)': 'var(--border-2)',
        ":is(.floating-toc-list a[data-active='true'])": 'var(--primary)',
      },
      color: {
        default: null,
        ':is(.floating-toc-list a)': 'var(--ink-3)',
        ':is(.floating-toc-list a:hover)': 'var(--ink)',
        ":is(.floating-toc-list a[data-active='true'])": 'var(--primary)',
      },
      transition: {
        default: null,
        ':is(.floating-toc-list a)': 'all 180ms',
      },
      fontWeight: {
        default: null,
        ":is(.floating-toc-list a[data-active='true'])": '500',
      },
    },
  },
  floating_toc_scroll_top: {
    '@layer site': {
      display: 'grid',
      width: '40px',
      height: '40px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '50%',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
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
        ":is(.floating-toc-scroll-top[data-show='false'])": 'none',
      },
      transform: {
        default: null,
        ":is(.floating-toc-scroll-top[data-show='false'])": 'translateY(8px)',
      },
      opacity: {
        default: null,
        ":is(.floating-toc-scroll-top[data-show='false'])": '0',
      },
    },
  },
  floating_toc_share: {
    '@layer site': {
      display: 'grid',
      width: '40px',
      height: '40px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '50%',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
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
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border)',
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: 'var(--border)',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: 'var(--border)',
      borderRadius: '8px',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      color: 'var(--ink-2)',
      transform: {
        default: 'translateY(6px)',
        ":is(.floating-toc-toast[data-show='true'])": 'none',
      },
      transition: 'opacity 160ms,\n    transform 160ms',
      opacity: {
        default: '0',
        ":is(.floating-toc-toast[data-show='true'])": '1',
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
