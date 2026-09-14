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
const styles = stylex.create({
  reading_progress_dial: {
    '@layer site': {
      position: 'relative',
      display: 'grid',
      width: {
        default: '48px',
        '@media (max-width: 640px)': '42px',
      },
      height: {
        default: '48px',
        '@media (max-width: 640px)': '42px',
      },
      padding: '0',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '50%',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: {
        default: 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface) 80%, transparent)',
      },
      transition: {
        default: 'border-color 160ms ease,\n    transform 160ms ease',
        '@media (prefers-reduced-motion: reduce)': 'none',
      },
      cursor: 'pointer',
      placeItems: 'center',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      backdropFilter: 'blur(14px) saturate(140%)',
      transform: {
        default: null,
        ':hover': 'translateY(-1px)',
      },
    },
  },
  reading_progress_dial_svg: {
    '@layer site': {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      padding: '2px',
      boxSizing: 'border-box',
      transform: 'rotate(-90deg)',
    },
  },
  reading_progress_track: {
    '@layer site': {
      stroke: {
        default: 'var(--border)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--border) 80%, transparent)',
      },
    },
  },
  reading_progress_fill: {
    '@layer site': {
      stroke: 'var(--primary)',
      strokeDasharray: '100.53',
      strokeDashoffset:
        'calc(100.53px - (100.53px * var(--progress, 0) / 100))',
      transition: {
        default: 'stroke-dashoffset 120ms linear',
        '@media (prefers-reduced-motion: reduce)': 'stroke-dashoffset 0ms',
      },
    },
  },
  reading_progress_num: {
    '@layer site': {
      fontFamily: 'var(--font-mono), monospace',
      fontSize: {
        default: '10.5px',
        '@media (max-width: 640px)': '9.5px',
      },
      fontWeight: '600',
      letterSpacing: '-0.02em',
      color: 'var(--ink-2)',
    },
  },
  post_back: {
    '@layer site': {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '10px 0 24px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--primary)',
      },
      transition: 'color 200ms',
      gap: '10px',
      '--post-back-dot-border-color': {
        default: null,
        ':hover': 'var(--primary)',
      },
      '--post-back-dot-color': {
        default: null,
        ':hover': 'var(--primary)',
      },
    },
  },
  dot: {
    '@layer site': {
      display: 'grid',
      width: '22px',
      height: '22px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--post-back-dot-border-color, var(--border))',
      borderRadius: '50%',
      backgroundColor: 'var(--surface-2)',
      transition: 'all 200ms',
      placeItems: 'center',
      color: 'var(--post-back-dot-color, inherit)',
    },
  },
  post_masthead: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '24px 0 20px',
    },
  },
  post_meta_row: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: '4px',
      paddingTop: '16px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border)',
      gap: '20px',
    },
  },
  post_eyebrow: {
    '@layer site': {
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'var(--primary)',
    },
  },
  post_author: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
  },
  nm: {
    '@layer site': {
      fontSize: '14px',
      fontWeight: '600',
      lineHeight: '1.2',
      color: 'var(--ink)',
    },
  },
  sub: {
    '@layer site': {
      marginTop: '3px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11.5px',
      color: 'var(--ink-3)',
    },
  },
  post_tags_row: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    },
  },
  post_stats: {
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
      display: 'block',
      marginBottom: '2px',
      fontFamily: 'var(--font-sans), sans-serif',
      fontSize: '18px',
      fontWeight: '700',
      letterSpacing: '-0.01em',
      color: 'var(--ink)',
    },
  },
  post_title: {
    '@layer site': {
      fontSize: 'clamp(32px, 5.5vw, 64px)',
      fontWeight: '800',
      lineHeight: '1.05',
      letterSpacing: '-0.03em',
      color: 'var(--ink)',
    },
  },
  element_em: {
    '@layer site': {
      backgroundColor: 'transparent',
      backgroundImage:
        'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      backgroundSize: '200% 100%',
      fontFamily: 'inherit',
      fontStyle: 'normal !important',
      color: 'transparent !important',
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
  em_in_title: {
    '@layer site': {
      fontWeight: '800',
    },
  },
  em_in_list: {
    '@layer site': {
      fontWeight: 'inherit',
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const reading_progress_dial = stylex.props(
  styles.reading_progress_dial,
).className!
export const reading_progress_dial_svg = stylex.props(
  styles.reading_progress_dial_svg,
).className!
export const reading_progress_track = stylex.props(
  styles.reading_progress_track,
).className!
export const reading_progress_fill = stylex.props(
  styles.reading_progress_fill,
).className!
export const reading_progress_num = stylex.props(
  styles.reading_progress_num,
).className!
export const post_back = stylex.props(styles.post_back).className!
export const dot = stylex.props(styles.dot).className!
export const post_masthead = stylex.props(styles.post_masthead).className!
export const post_meta_row = stylex.props(styles.post_meta_row).className!
export const post_eyebrow = stylex.props(styles.post_eyebrow).className!
export const post_author = stylex.props(styles.post_author).className!
export const nm = stylex.props(styles.nm).className!
export const sub = stylex.props(styles.sub).className!
export const post_tags_row = stylex.props(styles.post_tags_row).className!
export const post_stats = stylex.props(styles.post_stats).className!
export const element_b = stylex.props(styles.element_b).className!
export const post_title = stylex.props(styles.post_title).className!
export const title_em = stylex.props(
  styles.element_em,
  styles.em_in_title,
).className!
export const list_em = stylex.props(
  styles.element_em,
  styles.em_in_list,
).className!
