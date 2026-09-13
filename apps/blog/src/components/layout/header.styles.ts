import * as stylex from '@stylexjs/stylex'
const motion_logo_spin = stylex.keyframes({
  to: {
    transform: 'rotate(360deg)',
  },
})
const styles = stylex.create({
  site_header: {
    '@layer site': {
      position: 'sticky',
      top: '0',
      zIndex: '40',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      backgroundColor: {
        default: 'var(--bg)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--bg) 70%, transparent)',
      },
      backgroundImage: {
        default: 'none',
        '@supports (color: color-mix(in lab, red, red))': 'none',
      },
      backgroundPosition: {
        default: 'initial',
        '@supports (color: color-mix(in lab, red, red))': 'initial',
      },
      backgroundSize: {
        default: 'auto',
        '@supports (color: color-mix(in lab, red, red))': 'auto',
      },
      backgroundRepeat: {
        default: 'repeat',
        '@supports (color: color-mix(in lab, red, red))': 'repeat',
      },
      backgroundOrigin: {
        default: 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': 'padding-box',
      },
      backgroundClip: {
        default: 'border-box',
        '@supports (color: color-mix(in lab, red, red))': 'border-box',
      },
      backgroundAttachment: {
        default: 'scroll',
        '@supports (color: color-mix(in lab, red, red))': 'scroll',
      },
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      backdropFilter: 'blur(14px) saturate(140%)',
      transition: {
        default: null,
        '@media (max-width: 639px)':
          'transform 260ms cubic-bezier(0.2, 0.9, 0.2, 1)',
        '@media (prefers-reduced-motion: reduce)': 'none',
      },
      transform: {
        default: null,
        '@media (max-width: 639px)': {
          default: null,
          ":is(.site-header[data-hidden='true'])": 'translateY(-100%)',
        },
      },
    },
  },
  site_header_inner: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '16px 32px',
      gap: '16px',
    },
  },
  logo_ring: {
    '@layer site': {
      display: 'grid',
      flexShrink: '0',
      width: '44px',
      height: '44px',
      padding: '2px',
      borderRadius: '50%',
      backgroundColor: 'transparent',
      backgroundImage:
        'conic-gradient(\n    from 0deg,\n    var(--primary),\n    var(--primary-2),\n    var(--primary-3),\n    #fbbf24,\n    var(--primary)\n  )',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
      transition: 'transform 400ms cubic-bezier(0.2, 0.9, 0.2, 1)',
      animationName: {
        default: motion_logo_spin,
        '@media (prefers-reduced-motion: reduce)': 'none',
      },
      animationDuration: {
        default: '14s',
        '@media (prefers-reduced-motion: reduce)': '0s',
      },
      animationTimingFunction: {
        default: 'linear',
        '@media (prefers-reduced-motion: reduce)': 'ease',
      },
      animationDelay: {
        default: '0s',
        '@media (prefers-reduced-motion: reduce)': '0s',
      },
      animationIterationCount: {
        default: 'infinite',
        '@media (prefers-reduced-motion: reduce)': '1',
      },
      animationDirection: {
        default: 'normal',
        '@media (prefers-reduced-motion: reduce)': 'normal',
      },
      animationFillMode: {
        default: 'none',
        '@media (prefers-reduced-motion: reduce)': 'none',
      },
      animationPlayState: {
        default: 'running',
        '@media (prefers-reduced-motion: reduce)': 'running',
      },
      placeItems: 'center',
      transform: {
        default: null,
        ':hover': 'rotate(8deg) scale(1.06)',
      },
    },
  },
  element_span: {
    '@layer site': {
      overflow: {
        default: null,
        ':is(.logo-ring > span)': 'hidden',
      },
      display: {
        default: null,
        ':is(.logo-ring > span)': 'grid',
      },
      width: {
        default: null,
        ':is(.logo-ring > span)': '100%',
      },
      height: {
        default: null,
        ':is(.logo-ring > span)': '100%',
      },
      borderRadius: {
        default: null,
        ':is(.logo-ring > span)': '50%',
      },
      backgroundColor: {
        default: null,
        ':is(.logo-ring > span)': 'var(--bg)',
      },
      backgroundImage: {
        default: null,
        ':is(.logo-ring > span)': 'none',
      },
      backgroundPosition: {
        default: null,
        ':is(.logo-ring > span)': 'initial',
      },
      backgroundSize: {
        default: null,
        ':is(.logo-ring > span)': 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':is(.logo-ring > span)': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':is(.logo-ring > span)': 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':is(.logo-ring > span)': 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':is(.logo-ring > span)': 'scroll',
      },
      placeItems: {
        default: null,
        ':is(.logo-ring > span)': 'center',
      },
    },
  },
  logo_name: {
    '@layer site': {
      fontSize: '18px',
      fontWeight: '800',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
      color: 'var(--ink)',
      display: {
        default: null,
        '@media (max-width: 639px)': 'none',
      },
    },
  },
  header_right: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
  },
  header_icons: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    },
  },
  header_sep: {
    '@layer site': {
      display: {
        default: 'none',
        '@media (min-width: 640px)': 'inline-block',
      },
      width: '1px',
      height: '22px',
      backgroundColor: 'transparent',
      backgroundImage:
        'linear-gradient(\n    180deg,\n    transparent,\n    var(--border-2),\n    transparent\n  )',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
    },
  },
  nav_pills: {
    '@layer site': {
      position: 'relative',
      padding: '4px',
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
      borderRadius: '999px',
      boxShadow: {
        default:
          'inset 0 1px 0 var(--surface),\n    0 6px 20px -14px var(--ink)',
        '@supports (color: color-mix(in lab, red, red))':
          'inset 0 1px 0 color-mix(in oklab, var(--surface) 80%, transparent),\n    0 6px 20px -14px color-mix(in oklab, var(--ink) 60%, transparent)',
      },
      backgroundColor: {
        default: 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface) 55%, transparent)',
      },
      backgroundImage: {
        default: 'none',
        '@supports (color: color-mix(in lab, red, red))': 'none',
      },
      backgroundPosition: {
        default: 'initial',
        '@supports (color: color-mix(in lab, red, red))': 'initial',
      },
      backgroundSize: {
        default: 'auto',
        '@supports (color: color-mix(in lab, red, red))': 'auto',
      },
      backgroundRepeat: {
        default: 'repeat',
        '@supports (color: color-mix(in lab, red, red))': 'repeat',
      },
      backgroundOrigin: {
        default: 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': 'padding-box',
      },
      backgroundClip: {
        default: 'border-box',
        '@supports (color: color-mix(in lab, red, red))': 'border-box',
      },
      backgroundAttachment: {
        default: 'scroll',
        '@supports (color: color-mix(in lab, red, red))': 'scroll',
      },
      gap: '2px',
      WebkitBackdropFilter: 'blur(10px) saturate(140%)',
      backdropFilter: 'blur(10px) saturate(140%)',
    },
  },
  nav_link: {
    '@layer site': {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      padding: '7px 14px',
      borderRadius: '999px',
      fontSize: '13.5px',
      fontWeight: '500',
      letterSpacing: '-0.005em',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
        ":is(.nav-link[data-active='true'])": 'var(--ink)',
      },
      transition:
        'color 180ms ease,\n    background-color 220ms ease,\n    box-shadow 220ms ease',
      gap: '6px',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface-2)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface-2) 80%, transparent)',
          ":is(.nav-link[data-active='true'])": 'transparent',
        },
        ":is(.nav-link[data-active='true'])": 'transparent',
      },
      backgroundImage: {
        default: null,
        ':hover': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'none',
          ":is(.nav-link[data-active='true'])":
            'linear-gradient(\n    180deg,\n    color-mix(in oklab, var(--primary) 18%, var(--surface)),\n    color-mix(in oklab, var(--primary) 10%, var(--surface))\n  )',
        },
        ":is(.nav-link[data-active='true'])":
          'linear-gradient(\n    180deg,\n    var(--primary),\n    var(--primary)\n  )',
      },
      backgroundPosition: {
        default: null,
        ':hover': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'initial',
          ":is(.nav-link[data-active='true'])": 'initial',
        },
        ":is(.nav-link[data-active='true'])": 'initial',
      },
      backgroundSize: {
        default: null,
        ':hover': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'auto',
          ":is(.nav-link[data-active='true'])": 'auto',
        },
        ":is(.nav-link[data-active='true'])": 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':hover': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'repeat',
          ":is(.nav-link[data-active='true'])": 'repeat',
        },
        ":is(.nav-link[data-active='true'])": 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':hover': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'padding-box',
          ":is(.nav-link[data-active='true'])": 'padding-box',
        },
        ":is(.nav-link[data-active='true'])": 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':hover': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'border-box',
          ":is(.nav-link[data-active='true'])": 'border-box',
        },
        ":is(.nav-link[data-active='true'])": 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':hover': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'scroll',
          ":is(.nav-link[data-active='true'])": 'scroll',
        },
        ":is(.nav-link[data-active='true'])": 'scroll',
      },
      boxShadow: {
        default: null,
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ":is(.nav-link[data-active='true'])":
            'inset 0 0 0 1px color-mix(in oklab, var(--primary) 35%, transparent),\n    0 6px 18px -10px color-mix(in oklab, var(--primary) 60%, transparent)',
          ':focus-visible':
            '0 0 0 2px var(--bg),\n    0 0 0 4px var(--primary)',
        },
        ':focus-visible': '0 0 0 2px var(--bg),\n    0 0 0 4px var(--primary)',
        ":is(.nav-link[data-active='true'])":
          'inset 0 0 0 1px var(--primary),\n    0 6px 18px -10px var(--primary)',
      },
      outline: {
        default: null,
        ':focus-visible': 'none',
      },
    },
  },
  nav_link_label: {
    content: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": "''",
        },
      },
    },
    display: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'inline-block',
        },
      },
    },
    width: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": '4px',
        },
      },
    },
    height: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": '4px',
        },
      },
    },
    marginRight: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": '8px',
        },
      },
    },
    borderRadius: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": '50%',
        },
      },
    },
    boxShadow: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)":
            '0 0 10px var(--primary-3)',
        },
      },
    },
    backgroundColor: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)":
            'var(--primary-3)',
        },
      },
    },
    backgroundImage: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'none',
        },
      },
    },
    backgroundPosition: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'initial',
        },
      },
    },
    backgroundSize: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'auto',
        },
      },
    },
    backgroundRepeat: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'repeat',
        },
      },
    },
    backgroundOrigin: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'padding-box',
        },
      },
    },
    backgroundClip: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'border-box',
        },
      },
    },
    backgroundAttachment: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'scroll',
        },
      },
    },
    verticalAlign: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)": 'middle',
        },
      },
    },
    transform: {
      default: null,
      '::before': {
        default: null,
        '@layer site': {
          default: null,
          ":is(.nav-link[data-active='true'] .nav-link-label)":
            'translateY(-1px)',
        },
      },
    },
  },
  nav_link_ext: {
    '@layer site': {
      transition:
        'transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1),\n    opacity 180ms ease',
      opacity: {
        default: '0.55',
        ":is(.nav-link[data-external='true']:hover .nav-link-ext)": '1',
      },
      transform: {
        default: null,
        ":is(.nav-link[data-external='true']:hover .nav-link-ext)":
          'translate(2px, -2px)',
      },
    },
  },
  icon_btn: {
    '@layer site': {
      display: 'grid',
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
        ':focus-visible': 'var(--ink)',
        ":is(.icon-btn[aria-expanded='true'])": 'var(--primary)',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'var(--primary)',
        ":is(.icon-btn[aria-expanded='true']:focus-visible)": 'var(--primary)',
      },
      transition:
        'color 180ms ease,\n    background-color 180ms ease,\n    transform 180ms cubic-bezier(0.2, 0.9, 0.2, 1)',
      placeItems: 'center',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface-2)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface-2) 80%, transparent)',
          ":is(.icon-btn[aria-expanded='true'])":
            'color-mix(in oklab, var(--primary) 14%, var(--surface-2))',
          ":is(.icon-btn[aria-expanded='true']:hover)":
            'color-mix(in oklab, var(--primary) 14%, var(--surface-2))',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'var(--primary)',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'var(--primary)',
      },
      backgroundImage: {
        default: null,
        ':hover': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'none',
          ":is(.icon-btn[aria-expanded='true'])": 'none',
          ":is(.icon-btn[aria-expanded='true']:hover)": 'none',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'none',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'none',
      },
      backgroundPosition: {
        default: null,
        ':hover': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'initial',
          ":is(.icon-btn[aria-expanded='true'])": 'initial',
          ":is(.icon-btn[aria-expanded='true']:hover)": 'initial',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'initial',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'initial',
      },
      backgroundSize: {
        default: null,
        ':hover': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'auto',
          ":is(.icon-btn[aria-expanded='true'])": 'auto',
          ":is(.icon-btn[aria-expanded='true']:hover)": 'auto',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'auto',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':hover': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'repeat',
          ":is(.icon-btn[aria-expanded='true'])": 'repeat',
          ":is(.icon-btn[aria-expanded='true']:hover)": 'repeat',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'repeat',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':hover': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'padding-box',
          ":is(.icon-btn[aria-expanded='true'])": 'padding-box',
          ":is(.icon-btn[aria-expanded='true']:hover)": 'padding-box',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'padding-box',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':hover': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'border-box',
          ":is(.icon-btn[aria-expanded='true'])": 'border-box',
          ":is(.icon-btn[aria-expanded='true']:hover)": 'border-box',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'border-box',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':hover': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'scroll',
          ":is(.icon-btn[aria-expanded='true'])": 'scroll',
          ":is(.icon-btn[aria-expanded='true']:hover)": 'scroll',
        },
        ":is(.icon-btn[aria-expanded='true'])": 'scroll',
        ":is(.icon-btn[aria-expanded='true']:hover)": 'scroll',
      },
      transform: {
        default: null,
        ':hover': 'translateY(-1px)',
        ':active': 'translateY(0)',
      },
      outline: {
        default: null,
        ':focus-visible': 'none',
      },
      boxShadow: {
        default: null,
        ':focus-visible': '0 0 0 2px var(--bg),\n    0 0 0 4px var(--primary)',
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const site_header = stylex.props(styles.site_header).className!
export const site_header_inner = stylex.props(
  styles.site_header_inner,
).className!
export const logo_ring = stylex.props(styles.logo_ring).className!
export const element_span = stylex.props(styles.element_span).className!
export const logo_name = stylex.props(styles.logo_name).className!
export const header_right = stylex.props(styles.header_right).className!
export const header_icons = stylex.props(styles.header_icons).className!
export const header_sep = stylex.props(styles.header_sep).className!
export const nav_pills = stylex.props(styles.nav_pills).className!
export const nav_link = stylex.props(styles.nav_link).className!
export const nav_link_label = stylex.props(styles.nav_link_label).className!
export const nav_link_ext = stylex.props(styles.nav_link_ext).className!
export const icon_btn = stylex.props(styles.icon_btn).className!
