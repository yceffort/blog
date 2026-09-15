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
      display: 'inline-flex',
      alignItems: 'center',
      marginBottom: '14px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '12px',
      letterSpacing: '0.35em',
      textTransform: 'uppercase',
      color: 'var(--primary)',
      gap: '10px',
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
      color: 'transparent',
      WebkitTextStroke: '2px var(--ink-3)',
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
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
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
      fontFamily: 'var(--font-sans), sans-serif',
    },
  },
  c: {
    '@layer site': {
      padding: '2px 7px',
      borderRadius: '999px',
      backgroundColor: {
        default: 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--c1, var(--primary)) 10%, transparent)',
      },
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '10px',
      letterSpacing: '0.04em',
      color: {
        default: 'var(--c1, var(--primary))',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--c1, var(--primary)) 70%, var(--ink-2))',
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
