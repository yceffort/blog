import * as stylex from '@stylexjs/stylex'

const motion_tweaks_in = stylex.keyframes({
  from: {transform: 'translateY(-8px)', opacity: 0},
  to: {transform: 'none', opacity: 1},
})

const motion_tweaks_in_sheet = stylex.keyframes({
  from: {transform: 'translateY(100%)', opacity: 0},
  to: {transform: 'none', opacity: 1},
})

const MOBILE = '@media (max-width: 639px)'

const styles = stylex.create({
  panel: {
    '@layer site': {
      position: 'fixed',
      overflowY: {default: null, [MOBILE]: 'auto'},
      top: {default: '82px', [MOBILE]: 'auto'},
      right: {default: '24px', [MOBILE]: 0},
      left: {default: null, [MOBILE]: 0},
      zIndex: 80,
      width: {default: '300px', [MOBILE]: 'auto'},
      maxHeight: {default: null, [MOBILE]: 'min(80vh, 640px)'},
      padding: {default: '20px', [MOBILE]: '18px 20px 24px'},
      paddingBottom: {
        default: null,
        [MOBILE]: 'max(24px, env(safe-area-inset-bottom))',
      },
      border: {default: '1px solid var(--border-2)', [MOBILE]: 0},
      borderTop: {default: null, [MOBILE]: '1px solid var(--border-2)'},
      borderRadius: {default: '14px', [MOBILE]: '22px 22px 0 0'},
      boxShadow: {
        default: '0 30px 60px -20px rgba(0, 0, 0, 0.5)',
        [MOBILE]: '0 -24px 60px -20px rgba(0, 0, 0, 0.45)',
      },
      background: {
        default: 'color-mix(in oklab, var(--surface) 92%, transparent)',
        [MOBILE]: 'var(--surface)',
      },
      fontSize: '13px',
      color: 'var(--ink)',
      animationName: {
        default: motion_tweaks_in,
        [MOBILE]: motion_tweaks_in_sheet,
      },
      animationDuration: {default: '240ms', [MOBILE]: '260ms'},
      animationTimingFunction: 'cubic-bezier(0.2, 0.9, 0.2, 1)',
      animationFillMode: 'both',
      backdropFilter: 'blur(20px)',
      // 모바일 시트의 드래그 핸들
      '::before': {
        content: {default: null, [MOBILE]: '""'},
        display: {default: null, [MOBILE]: 'block'},
        width: {default: null, [MOBILE]: '44px'},
        height: {default: null, [MOBILE]: '5px'},
        margin: {default: null, [MOBILE]: '0 auto 14px'},
        borderRadius: {default: null, [MOBILE]: '999px'},
        background: {default: null, [MOBILE]: 'var(--border-2)'},
      },
    },
  },
  heading: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '14px',
      fontSize: '14px',
      fontWeight: '700',
    },
  },
  close: {
    '@layer site': {
      padding: '0 4px',
      fontSize: '22px',
      lineHeight: '1',
      color: 'var(--ink-3)',
      cursor: 'pointer',
    },
  },
  label: {
    '@layer site': {
      display: 'block',
      marginBottom: '8px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '10px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
    },
  },
  label_inline: {
    '@layer site': {
      marginBottom: 0,
    },
  },
  row: {
    '@layer site': {},
  },
  row_spaced: {
    '@layer site': {
      marginTop: '16px',
    },
  },
  toggle_row: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  swatches: {
    '@layer site': {
      display: 'flex',
      gap: '8px',
    },
  },
  swatch: {
    '@layer site': {
      width: '28px',
      height: '28px',
      border: '2px solid transparent',
      borderRadius: '8px',
      transition: 'border-color 150ms',
      cursor: 'pointer',
    },
  },
  swatch_on: {
    '@layer site': {
      borderColor: 'var(--ink)',
    },
  },
  grid: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '6px',
      padding: '3px',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      background: 'color-mix(in oklab, var(--surface-2) 70%, transparent)',
    },
  },
  grid_btn: {
    '@layer site': {
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '8px 4px',
      borderRadius: '7px',
      fontSize: '11px',
      fontWeight: '500',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
      },
      background: {
        default: null,
        ':hover': 'color-mix(in oklab, var(--surface) 70%, transparent)',
      },
      transition:
        'color 160ms ease, background-color 180ms ease, box-shadow 180ms ease',
    },
  },
  grid_btn_on: {
    '@layer site': {
      boxShadow:
        'inset 0 0 0 1px color-mix(in oklab, var(--primary) 35%, transparent)',
      background: 'color-mix(in oklab, var(--primary) 14%, var(--surface))',
      color: 'var(--primary)',
    },
  },
  switch: {
    '@layer site': {
      position: 'relative',
      flexShrink: 0,
      width: '36px',
      height: '20px',
      border: '1px solid var(--border)',
      borderRadius: '999px',
      background: 'var(--bg-2)',
      transition: 'background 200ms',
      cursor: 'pointer',
      '::after': {
        content: '""',
        position: 'absolute',
        top: '2px',
        left: '2px',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: 'var(--ink-3)',
        transition: 'all 200ms',
      },
    },
  },
  switch_on: {
    '@layer site': {
      borderColor: 'var(--primary)',
      background: 'var(--primary)',
      '::after': {
        left: '18px',
        background: '#fff',
      },
    },
  },
})

export const panel = stylex.props(styles.panel).className!
export const heading = stylex.props(styles.heading).className!
export const close = stylex.props(styles.close).className!
export const label = stylex.props(styles.label).className!
export const label_inline = stylex.props(
  styles.label,
  styles.label_inline,
).className!
export const row = stylex.props(styles.row).className!
export const row_spaced = stylex.props(styles.row, styles.row_spaced).className!
export const toggle_row = stylex.props(
  styles.row,
  styles.row_spaced,
  styles.toggle_row,
).className!
export const swatches = stylex.props(styles.swatches).className!
export const swatch = stylex.props(styles.swatch).className!
export const swatch_on = stylex.props(
  styles.swatch,
  styles.swatch_on,
).className!
export const grid = stylex.props(styles.grid).className!
export const grid_btn = stylex.props(styles.grid_btn).className!
export const grid_btn_on = stylex.props(
  styles.grid_btn,
  styles.grid_btn_on,
).className!
export const switch_ = stylex.props(styles.switch).className!
export const switch_on = stylex.props(
  styles.switch,
  styles.switch_on,
).className!
