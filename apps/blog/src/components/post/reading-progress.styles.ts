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
      backgroundColor: {
        default: 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface) 80%, transparent)',
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
  element_svg: {
    '@layer site': {
      position: {
        default: null,
        ':is(.reading-progress-dial svg)': 'absolute',
      },
      inset: {
        default: null,
        ':is(.reading-progress-dial svg)': '0',
      },
      width: {
        default: null,
        ':is(.reading-progress-dial svg)': '100%',
      },
      height: {
        default: null,
        ':is(.reading-progress-dial svg)': '100%',
      },
      padding: {
        default: null,
        ':is(.reading-progress-dial svg)': '2px',
      },
      boxSizing: {
        default: null,
        ':is(.reading-progress-dial svg)': 'border-box',
      },
      transform: {
        default: null,
        ':is(.reading-progress-dial svg)': 'rotate(-90deg)',
      },
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
    },
  },
  dot: {
    '@layer site': {
      display: {
        default: null,
        ':is(.post-back .dot)': 'grid',
      },
      width: {
        default: null,
        ':is(.post-back .dot)': '22px',
      },
      height: {
        default: null,
        ':is(.post-back .dot)': '22px',
      },
      borderTopWidth: {
        default: null,
        ':is(.post-back .dot)': '1px',
      },
      borderTopStyle: {
        default: null,
        ':is(.post-back .dot)': 'solid',
      },
      borderTopColor: {
        default: null,
        ':is(.post-back .dot)': 'var(--border)',
        ':is(.post-back:hover .dot)': 'var(--primary)',
      },
      borderRightWidth: {
        default: null,
        ':is(.post-back .dot)': '1px',
      },
      borderRightStyle: {
        default: null,
        ':is(.post-back .dot)': 'solid',
      },
      borderRightColor: {
        default: null,
        ':is(.post-back .dot)': 'var(--border)',
        ':is(.post-back:hover .dot)': 'var(--primary)',
      },
      borderBottomWidth: {
        default: null,
        ':is(.post-back .dot)': '1px',
      },
      borderBottomStyle: {
        default: null,
        ':is(.post-back .dot)': 'solid',
      },
      borderBottomColor: {
        default: null,
        ':is(.post-back .dot)': 'var(--border)',
        ':is(.post-back:hover .dot)': 'var(--primary)',
      },
      borderLeftWidth: {
        default: null,
        ':is(.post-back .dot)': '1px',
      },
      borderLeftStyle: {
        default: null,
        ':is(.post-back .dot)': 'solid',
      },
      borderLeftColor: {
        default: null,
        ':is(.post-back .dot)': 'var(--border)',
        ':is(.post-back:hover .dot)': 'var(--primary)',
      },
      borderRadius: {
        default: null,
        ':is(.post-back .dot)': '50%',
      },
      backgroundColor: {
        default: null,
        ':is(.post-back .dot)': 'var(--surface-2)',
      },
      backgroundImage: {
        default: null,
        ':is(.post-back .dot)': 'none',
      },
      backgroundPosition: {
        default: null,
        ':is(.post-back .dot)': 'initial',
      },
      backgroundSize: {
        default: null,
        ':is(.post-back .dot)': 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':is(.post-back .dot)': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':is(.post-back .dot)': 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':is(.post-back .dot)': 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':is(.post-back .dot)': 'scroll',
      },
      transition: {
        default: null,
        ':is(.post-back .dot)': 'all 200ms',
      },
      placeItems: {
        default: null,
        ':is(.post-back .dot)': 'center',
      },
      color: {
        default: null,
        ':is(.post-back:hover .dot)': 'var(--primary)',
      },
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
      fontSize: {
        default: null,
        ':is(.post-author .nm)': '14px',
      },
      fontWeight: {
        default: null,
        ':is(.post-author .nm)': '600',
      },
      lineHeight: {
        default: null,
        ':is(.post-author .nm)': '1.2',
      },
      color: {
        default: null,
        ':is(.post-author .nm)': 'var(--ink)',
      },
    },
  },
  sub: {
    '@layer site': {
      marginTop: {
        default: null,
        ':is(.post-author .sub)': '3px',
      },
      fontFamily: {
        default: null,
        ':is(.post-author .sub)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.post-author .sub)': '11.5px',
      },
      color: {
        default: null,
        ':is(.post-author .sub)': 'var(--ink-3)',
      },
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
      display: {
        default: null,
        ':is(.post-stats b)': 'block',
      },
      marginBottom: {
        default: null,
        ':is(.post-stats b)': '2px',
      },
      fontFamily: {
        default: null,
        ':is(.post-stats b)': 'var(--font-sans), sans-serif',
      },
      fontSize: {
        default: null,
        ':is(.post-stats b)': '18px',
      },
      fontWeight: {
        default: null,
        ':is(.post-stats b)': '700',
      },
      letterSpacing: {
        default: null,
        ':is(.post-stats b)': '-0.01em',
      },
      color: {
        default: null,
        ':is(.post-stats b)': 'var(--ink)',
      },
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
      backgroundColor: {
        default: null,
        ':is(.post-title em)': 'transparent',
        ':is(.post-card h3 em)': 'transparent',
        ':is(.rec-row h4 em)': 'transparent',
        ':is(.post-row-title em)': 'transparent',
      },
      backgroundImage: {
        default: null,
        ':is(.post-title em)':
          'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
        ':is(.post-card h3 em)':
          'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
        ':is(.rec-row h4 em)':
          'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
        ':is(.post-row-title em)':
          'linear-gradient(\n    120deg,\n    var(--primary) 0%,\n    var(--primary-2) 50%,\n    var(--primary-3) 100%\n  )',
      },
      backgroundPosition: {
        default: null,
        ':is(.post-title em)': 'initial',
        ':is(.post-card h3 em)': 'initial',
        ':is(.rec-row h4 em)': 'initial',
        ':is(.post-row-title em)': 'initial',
      },
      backgroundRepeat: {
        default: null,
        ':is(.post-title em)': 'repeat',
        ':is(.post-card h3 em)': 'repeat',
        ':is(.rec-row h4 em)': 'repeat',
        ':is(.post-row-title em)': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':is(.post-title em)': 'padding-box',
        ':is(.post-card h3 em)': 'padding-box',
        ':is(.rec-row h4 em)': 'padding-box',
        ':is(.post-row-title em)': 'padding-box',
      },
      backgroundAttachment: {
        default: null,
        ':is(.post-title em)': 'scroll',
        ':is(.post-card h3 em)': 'scroll',
        ':is(.rec-row h4 em)': 'scroll',
        ':is(.post-row-title em)': 'scroll',
      },
      WebkitBackgroundClip: {
        default: null,
        ':is(.post-title em)': 'text',
        ':is(.post-card h3 em)': 'text',
        ':is(.rec-row h4 em)': 'text',
        ':is(.post-row-title em)': 'text',
      },
      backgroundClip: {
        default: null,
        ':is(.post-title em)': 'text',
        ':is(.post-card h3 em)': 'text',
        ':is(.rec-row h4 em)': 'text',
        ':is(.post-row-title em)': 'text',
      },
      backgroundSize: {
        default: null,
        ':is(.post-title em)': '200% 100%',
        ':is(.post-card h3 em)': '200% 100%',
        ':is(.rec-row h4 em)': '200% 100%',
        ':is(.post-row-title em)': '200% 100%',
      },
      fontFamily: {
        default: null,
        ':is(.post-title em)': 'inherit',
        ':is(.post-card h3 em)': 'inherit',
        ':is(.rec-row h4 em)': 'inherit',
        ':is(.post-row-title em)': 'inherit',
      },
      fontStyle: {
        default: null,
        ':is(.post-title em)': 'normal !important',
        ':is(.post-card h3 em)': 'normal !important',
        ':is(.rec-row h4 em)': 'normal !important',
        ':is(.post-row-title em)': 'normal !important',
      },
      fontWeight: {
        default: null,
        ':is(.post-title em)': '800',
        ':is(.post-card h3 em)': 'inherit',
        ':is(.rec-row h4 em)': 'inherit',
        ':is(.post-row-title em)': 'inherit',
      },
      color: {
        default: null,
        ':is(.post-title em)': 'transparent !important',
        ':is(.post-card h3 em)': 'transparent !important',
        ':is(.rec-row h4 em)': 'transparent !important',
        ':is(.post-row-title em)': 'transparent !important',
      },
      animationName: {
        default: null,
        ':is(.post-title em)': motion_hero_hue,
        ':is(.post-card h3 em)': motion_hero_hue,
        ':is(.rec-row h4 em)': motion_hero_hue,
        ':is(.post-row-title em)': motion_hero_hue,
      },
      animationDuration: {
        default: null,
        ':is(.post-title em)': '10s',
        ':is(.post-card h3 em)': '10s',
        ':is(.rec-row h4 em)': '10s',
        ':is(.post-row-title em)': '10s',
      },
      animationTimingFunction: {
        default: null,
        ':is(.post-title em)': 'ease-in-out',
        ':is(.post-card h3 em)': 'ease-in-out',
        ':is(.rec-row h4 em)': 'ease-in-out',
        ':is(.post-row-title em)': 'ease-in-out',
      },
      animationDelay: {
        default: null,
        ':is(.post-title em)': '0s',
        ':is(.post-card h3 em)': '0s',
        ':is(.rec-row h4 em)': '0s',
        ':is(.post-row-title em)': '0s',
      },
      animationIterationCount: {
        default: null,
        ':is(.post-title em)': 'infinite',
        ':is(.post-card h3 em)': 'infinite',
        ':is(.rec-row h4 em)': 'infinite',
        ':is(.post-row-title em)': 'infinite',
      },
      animationDirection: {
        default: null,
        ':is(.post-title em)': 'normal',
        ':is(.post-card h3 em)': 'normal',
        ':is(.rec-row h4 em)': 'normal',
        ':is(.post-row-title em)': 'normal',
      },
      animationFillMode: {
        default: null,
        ':is(.post-title em)': 'none',
        ':is(.post-card h3 em)': 'none',
        ':is(.rec-row h4 em)': 'none',
        ':is(.post-row-title em)': 'none',
      },
      animationPlayState: {
        default: null,
        ':is(.post-title em)': 'running',
        ':is(.post-card h3 em)': 'running',
        ':is(.rec-row h4 em)': 'running',
        ':is(.post-row-title em)': 'running',
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const reading_progress_dial = stylex.props(
  styles.reading_progress_dial,
).className!
export const element_svg = stylex.props(styles.element_svg).className!
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
export const element_em = stylex.props(styles.element_em).className!
