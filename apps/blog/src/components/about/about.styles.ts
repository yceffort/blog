import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  about_hero: {
    '@layer site': {
      display: 'grid',
      alignItems: 'center',
      padding: '24px 0 32px',
      gridTemplateColumns: {
        default: '1fr',
        '@media (min-width: 900px)': '1.3fr 1fr',
      },
      gap: '24px',
    },
  },
  about_socials: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      marginTop: '20px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '13px',
      color: 'var(--ink-2)',
    },
  },
  element_a: {
    '@layer site': {
      display: {
        default: null,
        ':is(.about-socials a)': 'inline-flex',
      },
      alignItems: {
        default: null,
        ':is(.about-socials a)': 'center',
      },
      padding: {
        default: null,
        ':is(.about-socials a)': '8px 14px',
        ':is(.tabs a)': '12px 24px',
      },
      borderTopWidth: {
        default: null,
        ':is(.about-socials a)': '1px',
      },
      borderTopStyle: {
        default: null,
        ':is(.about-socials a)': 'solid',
      },
      borderTopColor: {
        default: null,
        ':is(.about-socials a)': 'var(--border)',
        ':is(.about-socials a:hover)': 'var(--primary)',
      },
      borderRightWidth: {
        default: null,
        ':is(.about-socials a)': '1px',
      },
      borderRightStyle: {
        default: null,
        ':is(.about-socials a)': 'solid',
      },
      borderRightColor: {
        default: null,
        ':is(.about-socials a)': 'var(--border)',
        ':is(.about-socials a:hover)': 'var(--primary)',
      },
      borderBottomWidth: {
        default: null,
        ':is(.about-socials a)': '1px',
      },
      borderBottomStyle: {
        default: null,
        ':is(.about-socials a)': 'solid',
      },
      borderBottomColor: {
        default: null,
        ':is(.about-socials a)': 'var(--border)',
        ':is(.about-socials a:hover)': 'var(--primary)',
      },
      borderLeftWidth: {
        default: null,
        ':is(.about-socials a)': '1px',
      },
      borderLeftStyle: {
        default: null,
        ':is(.about-socials a)': 'solid',
      },
      borderLeftColor: {
        default: null,
        ':is(.about-socials a)': 'var(--border)',
        ':is(.about-socials a:hover)': 'var(--primary)',
      },
      borderRadius: {
        default: null,
        ':is(.about-socials a)': '8px',
      },
      gap: {
        default: null,
        ':is(.about-socials a)': '8px',
      },
      color: {
        default: null,
        ':is(.about-socials a:hover)': 'var(--primary)',
        ':is(.tabs a)': 'var(--ink-3)',
        ":is(.tabs a[data-active='true'])": 'var(--ink)',
      },
      flex: {
        default: null,
        ':is(.tabs a)': '1',
      },
      fontSize: {
        default: null,
        ':is(.tabs a)': '14px',
      },
      fontWeight: {
        default: null,
        ':is(.tabs a)': '600',
      },
      letterSpacing: {
        default: null,
        ':is(.tabs a)': '-0.01em',
      },
      textAlign: {
        default: null,
        ':is(.tabs a)': 'center',
      },
      textDecoration: {
        default: null,
        ':is(.tabs a)': 'none',
      },
    },
    backgroundColor: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'var(--surface)',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'var(--primary)',
        },
      },
    },
    backgroundImage: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'none',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'none',
        },
      },
    },
    backgroundPosition: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'initial',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'initial',
        },
      },
    },
    backgroundSize: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'auto',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'auto',
        },
      },
    },
    backgroundRepeat: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'repeat',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'repeat',
        },
      },
    },
    backgroundOrigin: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'padding-box',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'padding-box',
        },
      },
    },
    backgroundClip: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'border-box',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'border-box',
        },
      },
    },
    backgroundAttachment: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'scroll',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'scroll',
        },
      },
    },
    transition: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.about-socials a)': 'all 200ms',
        ':is(.tabs a)': 'color 180ms',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'transform 240ms cubic-bezier(0.2, 0.9, 0.2, 1)',
        },
      },
    },
    position: {
      default: null,
      '@layer site': {
        default: null,
        ':is(.tabs a)': 'relative',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'absolute',
        },
      },
    },
    content: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': "''",
        },
      },
    },
    right: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': '0',
        },
      },
    },
    bottom: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': '-1px',
        },
      },
    },
    left: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': '0',
        },
      },
    },
    height: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': '2px',
        },
      },
    },
    transform: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          ':is(.tabs a)': 'scaleX(0)',
          ":is(.tabs a[data-active='true'])": 'scaleX(1)',
        },
      },
    },
  },
  tabs: {
    '@layer site': {
      position: 'relative',
      display: 'flex',
      margin: '32px 0 24px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      gap: '0',
    },
  },
  page_title_fx: {
    '@layer site': {
      position: 'relative',
      width: '100%',
      height: 'clamp(140px, 22vw, 240px)',
      margin: '4px 0 8px',
    },
  },
  element_canvas: {
    '@layer site': {
      display: {
        default: null,
        ':is(.page-title-fx canvas)': 'block',
        ':is(.hero-fx-b canvas)': 'block',
      },
      width: {
        default: null,
        ':is(.page-title-fx canvas)': '100% !important',
      },
      height: {
        default: null,
        ':is(.page-title-fx canvas)': '100% !important',
      },
      borderRadius: {
        default: null,
        ':is(.hero-fx-b canvas)': '50%',
      },
      cursor: {
        default: null,
        ':is(.hero-fx-b canvas)': 'crosshair',
      },
    },
  },
  hero_fx_canvas: {
    '@layer site': {
      position: 'relative',
      width: '100%',
      height: '100%',
      touchAction: 'pan-y',
    },
  },
  hero_fx_hint: {
    '@layer site': {
      position: 'absolute',
      right: '8px',
      bottom: '4px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      opacity: '0.65',
      pointerEvents: 'none',
    },
  },
  hero_fx_hint_touch: {
    '@layer site': {
      display: {
        default: 'none',
        '@media (hover: none) and (pointer: coarse)': 'block',
      },
    },
  },
  hero_fx_hint_desktop: {
    '@layer site': {
      display: {
        default: null,
        '@media (hover: none) and (pointer: coarse)': 'none',
      },
    },
  },
  hero_fx_b: {
    '@layer site': {
      width: '320px',
      height: '320px',
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const about_hero = stylex.props(styles.about_hero).className!
export const about_socials = stylex.props(styles.about_socials).className!
export const element_a = stylex.props(styles.element_a).className!
export const tabs = stylex.props(styles.tabs).className!
export const page_title_fx = stylex.props(styles.page_title_fx).className!
export const element_canvas = stylex.props(styles.element_canvas).className!
export const hero_fx_canvas = stylex.props(styles.hero_fx_canvas).className!
export const hero_fx_hint = stylex.props(styles.hero_fx_hint).className!
export const hero_fx_hint_touch = stylex.props(
  styles.hero_fx_hint_touch,
).className!
export const hero_fx_hint_desktop = stylex.props(
  styles.hero_fx_hint_desktop,
).className!
export const hero_fx_b = stylex.props(styles.hero_fx_b).className!
