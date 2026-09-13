import * as stylex from '@stylexjs/stylex'
const motion_hero_blink = stylex.keyframes({
  '0%': {
    opacity: '1',
  },
  '100%': {
    opacity: '1',
  },
  '50%': {
    opacity: '0.3',
  },
})
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
const styles = stylex.create({
  home_hero: {
    '@layer site': {
      position: 'relative',
      padding: {
        default: '32px 0 28px',
        '@media (max-width: 640px)': '20px 0 16px',
      },
      perspective: '1400px',
    },
  },
  home_hero_inner: {
    '@layer site': {
      position: 'relative',
      transformStyle: 'preserve-3d',
    },
  },
  hero_eyebrow: {
    '@layer site': {
      display: 'inline-flex',
      alignItems: 'center',
      marginBottom: '18px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '12px',
      letterSpacing: '0.35em',
      textTransform: 'uppercase',
      color: 'var(--primary)',
      gap: '10px',
    },
  },
  dot: {
    '@layer site': {
      width: {
        default: null,
        ':is(.hero-eyebrow .dot)': '7px',
      },
      height: {
        default: null,
        ':is(.hero-eyebrow .dot)': '7px',
      },
      borderRadius: {
        default: null,
        ':is(.hero-eyebrow .dot)': '50%',
      },
      boxShadow: {
        default: null,
        ':is(.hero-eyebrow .dot)': '0 0 12px var(--primary-3)',
      },
      backgroundColor: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'var(--primary-3)',
      },
      backgroundImage: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'none',
      },
      backgroundPosition: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'initial',
      },
      backgroundSize: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'scroll',
      },
      animationName: {
        default: null,
        ':is(.hero-eyebrow .dot)': motion_hero_blink,
      },
      animationDuration: {
        default: null,
        ':is(.hero-eyebrow .dot)': '1.6s',
      },
      animationTimingFunction: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'ease-in-out',
      },
      animationDelay: {
        default: null,
        ':is(.hero-eyebrow .dot)': '0s',
      },
      animationIterationCount: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'infinite',
      },
      animationDirection: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'normal',
      },
      animationFillMode: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'none',
      },
      animationPlayState: {
        default: null,
        ':is(.hero-eyebrow .dot)': 'running',
      },
    },
  },
  hero_title: {
    '@layer site': {
      position: 'relative',
      fontSize: 'clamp(40px, 6.5vw, 92px)',
      fontWeight: '900',
      lineHeight: '1',
      letterSpacing: '-0.045em',
      color: 'var(--ink)',
      transformStyle: 'preserve-3d',
    },
  },
  ln: {
    '@layer site': {
      position: {
        default: null,
        ':is(.hero-title .ln)': 'relative',
      },
      display: {
        default: null,
        ':is(.hero-title .ln)': 'inline-block',
      },
      transition: {
        default: null,
        ':is(.hero-title .ln)': 'transform 120ms ease-out',
      },
      willChange: {
        default: null,
        ':is(.hero-title .ln)': 'transform',
      },
      marginRight: {
        default: null,
        ':is(.hero-title .accent .hero-title .ln:not(:last-child))': '0.22em',
      },
    },
  },
  accent: {
    '@layer site': {
      paddingRight: {
        default: null,
        ':is(.hero-title .accent)': '0.04em',
      },
      backgroundColor: {
        default: null,
        ':is(.hero-title .accent)': 'transparent',
      },
      backgroundImage: {
        default: null,
        ':is(.hero-title .accent)':
          'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
      },
      backgroundPosition: {
        default: null,
        ':is(.hero-title .accent)': 'initial',
      },
      backgroundRepeat: {
        default: null,
        ':is(.hero-title .accent)': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':is(.hero-title .accent)': 'padding-box',
      },
      backgroundAttachment: {
        default: null,
        ':is(.hero-title .accent)': 'scroll',
      },
      WebkitBackgroundClip: {
        default: null,
        ':is(.hero-title .accent)': 'text',
      },
      backgroundClip: {
        default: null,
        ':is(.hero-title .accent)': 'text',
      },
      backgroundSize: {
        default: null,
        ':is(.hero-title .accent)': '200% 100%',
      },
      color: {
        default: null,
        ':is(.hero-title .accent)': 'transparent',
      },
      animationName: {
        default: null,
        ':is(.hero-title .accent)': motion_hero_hue,
      },
      animationDuration: {
        default: null,
        ':is(.hero-title .accent)': '10s',
      },
      animationTimingFunction: {
        default: null,
        ':is(.hero-title .accent)': 'ease-in-out',
      },
      animationDelay: {
        default: null,
        ':is(.hero-title .accent)': '0s',
      },
      animationIterationCount: {
        default: null,
        ':is(.hero-title .accent)': 'infinite',
      },
      animationDirection: {
        default: null,
        ':is(.hero-title .accent)': 'normal',
      },
      animationFillMode: {
        default: null,
        ':is(.hero-title .accent)': 'none',
      },
      animationPlayState: {
        default: null,
        ':is(.hero-title .accent)': 'running',
      },
    },
  },
  stroke: {
    '@layer site': {
      marginLeft: {
        default: null,
        ':is(.hero-title .stroke)': '0.02em',
      },
      fontWeight: {
        default: null,
        ':is(.hero-title .stroke)': '700',
      },
      color: {
        default: null,
        ':is(.hero-title .stroke)': 'var(--ink-4)',
      },
    },
  },
  hero_sub: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '22px',
      gap: '28px',
    },
  },
  element_p: {
    '@layer site': {
      maxWidth: {
        default: null,
        ':is(.hero-sub p)': '560px',
      },
      fontSize: {
        default: null,
        ':is(.hero-sub p)': '15px',
      },
      lineHeight: {
        default: null,
        ':is(.hero-sub p)': '1.6',
      },
      color: {
        default: null,
        ':is(.hero-sub p)': 'var(--ink-2)',
      },
    },
  },
  hero_stats: {
    '@layer site': {
      display: 'flex',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      gap: '22px',
    },
  },
  element_b: {
    '@layer site': {
      display: {
        default: null,
        ':is(.hero-stats b)': 'block',
      },
      marginBottom: {
        default: null,
        ':is(.hero-stats b)': '2px',
      },
      fontFamily: {
        default: null,
        ':is(.hero-stats b)': 'var(--font-sans), -apple-system, sans-serif',
      },
      fontSize: {
        default: null,
        ':is(.hero-stats b)': '20px',
      },
      fontWeight: {
        default: null,
        ':is(.hero-stats b)': '800',
      },
      letterSpacing: {
        default: null,
        ':is(.hero-stats b)': '-0.02em',
      },
      color: {
        default: null,
        ':is(.hero-stats b)': 'var(--ink)',
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const home_hero = stylex.props(styles.home_hero).className!
export const home_hero_inner = stylex.props(styles.home_hero_inner).className!
export const hero_eyebrow = stylex.props(styles.hero_eyebrow).className!
export const dot = stylex.props(styles.dot).className!
export const hero_title = stylex.props(styles.hero_title).className!
export const ln = stylex.props(styles.ln).className!
export const accent = stylex.props(styles.accent).className!
export const stroke = stylex.props(styles.stroke).className!
export const hero_sub = stylex.props(styles.hero_sub).className!
export const element_p = stylex.props(styles.element_p).className!
export const hero_stats = stylex.props(styles.hero_stats).className!
export const element_b = stylex.props(styles.element_b).className!
