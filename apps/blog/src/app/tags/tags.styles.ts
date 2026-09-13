import * as stylex from '@stylexjs/stylex'
const motion_hero_hue = stylex.keyframes({
  '0%': {
    backgroundPosition: '0% 50%',
  },
  '100%': {
    backgroundPosition: '0% 50%',
  },
  '50%': {
    backgroundPosition: '100% 50%',
  },
})
const motion_tchip_in = stylex.keyframes({
  from: {
    transform: 'translateY(14px)',
    opacity: '0',
  },
  to: {
    transform: 'none',
    opacity: '1',
  },
})
const styles = stylex.create({
  page_hero: {
    '@layer site': {
      padding: '60px 0 40px',
    },
  },
  hero_eyebrow: {
    '@layer site': {
      marginBottom: {
        default: null,
        ':is(.page-hero .hero-eyebrow)': '14px',
      },
    },
  },
  page_title: {
    '@layer site': {
      marginBottom: '18px',
      fontSize: 'clamp(48px, 10vw, 120px)',
      fontWeight: '900',
      lineHeight: '0.9',
      letterSpacing: '-0.045em',
      color: 'var(--ink)',
    },
  },
  accent: {
    '@layer site': {
      backgroundColor: {
        default: null,
        ':is(.page-title .accent)': 'transparent',
      },
      backgroundImage: {
        default: null,
        ':is(.page-title .accent)':
          'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
      },
      backgroundPosition: {
        default: null,
        ':is(.page-title .accent)': 'initial',
      },
      backgroundRepeat: {
        default: null,
        ':is(.page-title .accent)': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':is(.page-title .accent)': 'padding-box',
      },
      backgroundAttachment: {
        default: null,
        ':is(.page-title .accent)': 'scroll',
      },
      WebkitBackgroundClip: {
        default: null,
        ':is(.page-title .accent)': 'text',
      },
      backgroundClip: {
        default: null,
        ':is(.page-title .accent)': 'text',
      },
      backgroundSize: {
        default: null,
        ':is(.page-title .accent)': '200% 100%',
      },
      color: {
        default: null,
        ':is(.page-title .accent)': 'transparent',
      },
      animationName: {
        default: null,
        ':is(.page-title .accent)': motion_hero_hue,
      },
      animationDuration: {
        default: null,
        ':is(.page-title .accent)': '10s',
      },
      animationTimingFunction: {
        default: null,
        ':is(.page-title .accent)': 'ease-in-out',
      },
      animationDelay: {
        default: null,
        ':is(.page-title .accent)': '0s',
      },
      animationIterationCount: {
        default: null,
        ':is(.page-title .accent)': 'infinite',
      },
      animationDirection: {
        default: null,
        ':is(.page-title .accent)': 'normal',
      },
      animationFillMode: {
        default: null,
        ':is(.page-title .accent)': 'none',
      },
      animationPlayState: {
        default: null,
        ':is(.page-title .accent)': 'running',
      },
    },
  },
  stroke: {
    '@layer site': {
      color: {
        default: null,
        ':is(.page-title .stroke)': 'transparent',
      },
      WebkitTextStroke: {
        default: null,
        ':is(.page-title .stroke)': '2px var(--ink-3)',
      },
    },
  },
  page_sub: {
    '@layer site': {
      maxWidth: '540px',
      fontSize: '15px',
      lineHeight: '1.6',
      color: 'var(--ink-2)',
    },
  },
  tag_grid: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      padding: '36px 0 60px',
      perspective: '1200px',
    },
  },
  tchip: {
    '@layer site': {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 16px',
      borderTopWidth: {
        default: '1px',
        '@supports (color: color-mix(in lab, red, red))': '1px',
      },
      borderTopStyle: {
        default: 'solid',
        '@supports (color: color-mix(in lab, red, red))': 'solid',
      },
      borderTopColor: {
        default: 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))': {
          default:
            'color-mix(in oklab, var(--c1, var(--primary)) 40%, transparent)',
          ':hover': 'var(--c1, var(--primary))',
        },
        ':hover': 'var(--c1, var(--primary))',
      },
      borderRightWidth: {
        default: '1px',
        '@supports (color: color-mix(in lab, red, red))': '1px',
      },
      borderRightStyle: {
        default: 'solid',
        '@supports (color: color-mix(in lab, red, red))': 'solid',
      },
      borderRightColor: {
        default: 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))': {
          default:
            'color-mix(in oklab, var(--c1, var(--primary)) 40%, transparent)',
          ':hover': 'var(--c1, var(--primary))',
        },
        ':hover': 'var(--c1, var(--primary))',
      },
      borderBottomWidth: {
        default: '1px',
        '@supports (color: color-mix(in lab, red, red))': '1px',
      },
      borderBottomStyle: {
        default: 'solid',
        '@supports (color: color-mix(in lab, red, red))': 'solid',
      },
      borderBottomColor: {
        default: 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))': {
          default:
            'color-mix(in oklab, var(--c1, var(--primary)) 40%, transparent)',
          ':hover': 'var(--c1, var(--primary))',
        },
        ':hover': 'var(--c1, var(--primary))',
      },
      borderLeftWidth: {
        default: '1px',
        '@supports (color: color-mix(in lab, red, red))': '1px',
      },
      borderLeftStyle: {
        default: 'solid',
        '@supports (color: color-mix(in lab, red, red))': 'solid',
      },
      borderLeftColor: {
        default: 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))': {
          default:
            'color-mix(in oklab, var(--c1, var(--primary)) 40%, transparent)',
          ':hover': 'var(--c1, var(--primary))',
        },
        ':hover': 'var(--c1, var(--primary))',
      },
      borderRadius: '999px',
      backgroundColor: {
        default: 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--c1, var(--primary)) 14%, var(--surface))',
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
      fontWeight: '600',
      letterSpacing: '-0.01em',
      color: 'var(--c1, var(--primary))',
      transformStyle: 'preserve-3d',
      transition:
        'transform 240ms cubic-bezier(0.2, 0.9, 0.2, 1),\n    box-shadow 240ms,\n    border-color 240ms',
      animationName: motion_tchip_in,
      animationDuration: '420ms',
      animationTimingFunction: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
      animationDelay: '0s',
      animationIterationCount: '1',
      animationDirection: 'normal',
      animationFillMode: 'both',
      animationPlayState: 'running',
      cursor: 'pointer',
      gap: '10px',
      willChange: 'transform',
      boxShadow: {
        default: null,
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover':
            '0 12px 30px -14px\n    color-mix(in oklab, var(--c1, var(--primary)) 70%, transparent)',
        },
        ':hover': '0 12px 30px -14px\n    var(--c1, var(--primary))',
      },
    },
  },
  n: {
    '@layer site': {
      fontFamily: {
        default: null,
        ':is(.tchip .n)': 'var(--font-sans), sans-serif',
      },
    },
  },
  c: {
    '@layer site': {
      padding: {
        default: null,
        ':is(.tchip .c)': '2px 7px',
      },
      borderRadius: {
        default: null,
        ':is(.tchip .c)': '999px',
      },
      backgroundColor: {
        default: null,
        ':is(.tchip .c)': 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)':
            'color-mix(in oklab, var(--c1, var(--primary)) 10%, transparent)',
        },
      },
      backgroundImage: {
        default: null,
        ':is(.tchip .c)': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)': 'none',
        },
      },
      backgroundPosition: {
        default: null,
        ':is(.tchip .c)': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)': 'initial',
        },
      },
      backgroundSize: {
        default: null,
        ':is(.tchip .c)': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)': 'auto',
        },
      },
      backgroundRepeat: {
        default: null,
        ':is(.tchip .c)': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)': 'repeat',
        },
      },
      backgroundOrigin: {
        default: null,
        ':is(.tchip .c)': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)': 'padding-box',
        },
      },
      backgroundClip: {
        default: null,
        ':is(.tchip .c)': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)': 'border-box',
        },
      },
      backgroundAttachment: {
        default: null,
        ':is(.tchip .c)': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)': 'scroll',
        },
      },
      fontFamily: {
        default: null,
        ':is(.tchip .c)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.tchip .c)': '10px',
      },
      letterSpacing: {
        default: null,
        ':is(.tchip .c)': '0.04em',
      },
      color: {
        default: null,
        ':is(.tchip .c)': 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.tchip .c)':
            'color-mix(in oklab, var(--c1, var(--primary)) 70%, var(--ink-2))',
        },
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const page_hero = stylex.props(styles.page_hero).className!
export const hero_eyebrow = stylex.props(styles.hero_eyebrow).className!
export const page_title = stylex.props(styles.page_title).className!
export const accent = stylex.props(styles.accent).className!
export const stroke = stylex.props(styles.stroke).className!
export const page_sub = stylex.props(styles.page_sub).className!
export const tag_grid = stylex.props(styles.tag_grid).className!
export const tchip = stylex.props(styles.tchip).className!
export const n = stylex.props(styles.n).className!
export const c = stylex.props(styles.c).className!
