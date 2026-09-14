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
      width: '7px',
      height: '7px',
      borderRadius: '50%',
      boxShadow: '0 0 12px var(--primary-3)',
      backgroundColor: 'var(--primary-3)',
      animationName: motion_hero_blink,
      animationDuration: '1.6s',
      animationTimingFunction: 'ease-in-out',
      animationDelay: '0s',
      animationIterationCount: 'infinite',
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running',
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
      position: 'relative',
      display: 'inline-block',
      transition: 'transform 120ms ease-out',
      willChange: 'transform',
    },
  },
  accent: {
    '@layer site': {
      paddingRight: '0.04em',
      backgroundColor: 'transparent',
      backgroundImage:
        'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      backgroundSize: '200% 100%',
      color: 'transparent',
      animationName: motion_hero_hue,
      animationDuration: '10s',
      animationTimingFunction: 'ease-in-out',
      animationDelay: '0s',
      animationIterationCount: 'infinite',
      animationDirection: 'normal',
      animationFillMode: 'none',
      animationPlayState: 'running',
    },
  },
  stroke: {
    '@layer site': {
      marginLeft: '0.02em',
      fontWeight: '700',
      color: 'var(--ink-4)',
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
      maxWidth: '560px',
      fontSize: '15px',
      lineHeight: '1.6',
      color: 'var(--ink-2)',
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
  hero_stats_b: {
    '@layer site': {
      display: 'block',
      marginBottom: '2px',
      fontFamily: 'var(--font-sans), -apple-system, sans-serif',
      fontSize: '20px',
      fontWeight: '800',
      letterSpacing: '-0.02em',
      color: 'var(--ink)',
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
export const hero_stats_b = stylex.props(styles.hero_stats_b).className!
