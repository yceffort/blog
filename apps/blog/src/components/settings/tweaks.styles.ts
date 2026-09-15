import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  tweaks_panel: {
    '@layer site': {
      position: 'fixed',
      top: {
        default: '82px',
        '@media (max-width: 639px)': 'auto',
      },
      right: {
        default: '24px',
        '@media (max-width: 639px)': '0',
      },
      zIndex: '80',
      width: {
        default: '300px',
        '@media (max-width: 639px)': 'auto',
      },
      padding: {
        default: '20px',
        '@media (max-width: 639px)': '4px 20px 24px',
      },
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border-2)',
      borderRightWidth: {
        default: '1px',
        '@media (max-width: 639px)': '0',
      },
      borderRightStyle: {
        default: 'solid',
        '@media (max-width: 639px)': 'none',
      },
      borderRightColor: {
        default: 'var(--border-2)',
        '@media (max-width: 639px)': 'currentColor',
      },
      borderBottomWidth: {
        default: '1px',
        '@media (max-width: 639px)': '0',
      },
      borderBottomStyle: {
        default: 'solid',
        '@media (max-width: 639px)': 'none',
      },
      borderBottomColor: {
        default: 'var(--border-2)',
        '@media (max-width: 639px)': 'currentColor',
      },
      borderLeftWidth: {
        default: '1px',
        '@media (max-width: 639px)': '0',
      },
      borderLeftStyle: {
        default: 'solid',
        '@media (max-width: 639px)': 'none',
      },
      borderLeftColor: {
        default: 'var(--border-2)',
        '@media (max-width: 639px)': 'currentColor',
      },
      borderRadius: {
        default: '14px',
        '@media (max-width: 639px)': '22px 22px 0 0',
      },
      boxShadow: {
        default: '0 30px 60px -20px rgba(0, 0, 0, 0.5)',
        '@media (max-width: 639px)': '0 -24px 60px -20px rgba(0, 0, 0, 0.45)',
      },
      backgroundColor: {
        default: 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface) 96%, transparent)',
        '@media (max-width: 639px)': 'var(--surface)',
      },
      fontSize: '13px',
      color: 'var(--ink)',
      transform: {
        default: 'translateY(-14px) scale(0.94)',
        '@media (max-width: 639px)': {
          default: 'translateY(100%)',
          ':is([data-open="true"])': 'none',
        },
        ':is([data-open="true"])': 'none',
      },
      transformOrigin: {
        default: 'top right',
        '@media (max-width: 639px)': 'bottom center',
      },
      transition: {
        default:
          'transform 260ms cubic-bezier(0.16, 1, 0.3, 1),\n    opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        '@media (max-width: 639px)':
          'transform 320ms cubic-bezier(0.16, 1, 0.3, 1),\n      opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      opacity: {
        default: '0',
        ':is([data-open="true"])': '1',
      },
      pointerEvents: {
        default: 'none',
        ':is([data-open="true"])': 'auto',
      },
      willChange: 'transform, opacity',
      overflowY: {
        default: null,
        '@media (max-width: 639px)': 'auto',
      },
      bottom: {
        default: null,
        '@media (max-width: 639px)': '0',
      },
      left: {
        default: null,
        '@media (max-width: 639px)': '0',
      },
      maxHeight: {
        default: null,
        '@media (max-width: 639px)': 'min(80vh, 640px)',
      },
      paddingBottom: {
        default: null,
        '@media (max-width: 639px)': 'max(24px, env(safe-area-inset-bottom))',
      },
    },
  },
  tweaks_handle: {
    display: {
      default: null,
      '@layer site': {
        default: 'none',
        '@media (max-width: 639px)': 'block',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'block',
        },
      },
    },
    width: {
      default: null,
      '@layer site': {
        default: null,
        '@media (max-width: 639px)': '100%',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': '44px',
        },
      },
    },
    '@layer site': {
      padding: {
        default: null,
        '@media (max-width: 639px)': '10px 0 6px',
      },
      touchAction: {
        default: null,
        '@media (max-width: 639px)': 'none',
      },
      cursor: {
        default: null,
        '@media (max-width: 639px)': 'grab',
      },
    },
    content: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': "''",
        },
      },
    },
    height: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': '5px',
        },
      },
    },
    margin: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': '0 auto',
        },
      },
    },
    borderRadius: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': '999px',
        },
      },
    },
    backgroundColor: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'var(--border-2)',
        },
      },
    },
    backgroundImage: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'none',
        },
      },
    },
    backgroundPosition: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'initial',
        },
      },
    },
    backgroundSize: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'auto',
        },
      },
    },
    backgroundRepeat: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'repeat',
        },
      },
    },
    backgroundOrigin: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'padding-box',
        },
      },
    },
    backgroundClip: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'border-box',
        },
      },
    },
    backgroundAttachment: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: null,
          '@media (max-width: 639px)': 'scroll',
        },
      },
    },
  },
  element_h3: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '14px',
      fontSize: '14px',
      fontWeight: '700',
    },
  },
  x: {
    '@layer site': {
      padding: '0 4px',
      fontSize: '22px',
      lineHeight: '1',
      color: 'var(--ink-3)',
      cursor: 'pointer',
    },
  },
  element_label: {
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
  tweaks_label: {
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
  tweaks_row_next: {
    '@layer site': {
      marginTop: '16px',
    },
  },
  tweaks_swatches: {
    '@layer site': {
      display: 'flex',
      gap: '8px',
    },
  },
  tweaks_sw: {
    '@layer site': {
      width: '28px',
      height: '28px',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: {
        default: 'transparent',
        ':is([data-on="true"])': 'var(--ink)',
      },
      borderRadius: '8px',
      transition: 'border-color 150ms',
      cursor: 'pointer',
    },
  },
  tweaks_theme: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '6px',
      padding: '3px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border)',
      borderRadius: '10px',
      backgroundColor: {
        default: 'var(--surface-2)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface-2) 70%, transparent)',
      },
    },
  },
  tweaks_theme_btn: {
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
        ':is([data-on="true"])': 'var(--primary)',
        ':is([data-on="true"]):hover': 'var(--primary)',
      },
      transition:
        'color 160ms ease,\n    background-color 180ms ease,\n    box-shadow 180ms ease',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface) 70%, transparent)',
          ':is([data-on="true"])':
            'color-mix(in oklab, var(--primary) 14%, var(--surface))',
          ':is([data-on="true"]):hover':
            'color-mix(in oklab, var(--primary) 14%, var(--surface))',
        },
        ':is([data-on="true"])': 'var(--primary)',
        ':is([data-on="true"]):hover': 'var(--primary)',
      },
      backgroundImage: {
        default: null,
        ':hover': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'none',
          ':is([data-on="true"])': 'none',
          ':is([data-on="true"]):hover': 'none',
        },
        ':is([data-on="true"])': 'none',
        ':is([data-on="true"]):hover': 'none',
      },
      backgroundPosition: {
        default: null,
        ':hover': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'initial',
          ':is([data-on="true"])': 'initial',
          ':is([data-on="true"]):hover': 'initial',
        },
        ':is([data-on="true"])': 'initial',
        ':is([data-on="true"]):hover': 'initial',
      },
      backgroundSize: {
        default: null,
        ':hover': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'auto',
          ':is([data-on="true"])': 'auto',
          ':is([data-on="true"]):hover': 'auto',
        },
        ':is([data-on="true"])': 'auto',
        ':is([data-on="true"]):hover': 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':hover': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'repeat',
          ':is([data-on="true"])': 'repeat',
          ':is([data-on="true"]):hover': 'repeat',
        },
        ':is([data-on="true"])': 'repeat',
        ':is([data-on="true"]):hover': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':hover': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'padding-box',
          ':is([data-on="true"])': 'padding-box',
          ':is([data-on="true"]):hover': 'padding-box',
        },
        ':is([data-on="true"])': 'padding-box',
        ':is([data-on="true"]):hover': 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':hover': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'border-box',
          ':is([data-on="true"])': 'border-box',
          ':is([data-on="true"]):hover': 'border-box',
        },
        ':is([data-on="true"])': 'border-box',
        ':is([data-on="true"]):hover': 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':hover': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'scroll',
          ':is([data-on="true"])': 'scroll',
          ':is([data-on="true"]):hover': 'scroll',
        },
        ':is([data-on="true"])': 'scroll',
        ':is([data-on="true"]):hover': 'scroll',
      },
      boxShadow: {
        default: null,
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is([data-on="true"])':
            'inset 0 0 0 1px color-mix(in oklab, var(--primary) 35%, transparent)',
        },
        ':is([data-on="true"])': 'inset 0 0 0 1px var(--primary)',
      },
    },
  },
  element_input: {
    '@layer site': {
      width: {
        default: null,
        ':is([type="range"])': '100%',
      },
      accentColor: {
        default: null,
        ':is([type="range"])': 'var(--primary)',
      },
    },
  },
  tweaks_val: {
    '@layer site': {
      marginLeft: '6px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      color: 'var(--ink-3)',
    },
  },
  tweaks_toggle: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  },
  tweaks_switch: {
    position: {
      default: null,
      '@layer site': 'relative',
      '::after': {
        default: null,
        '@layer site': 'absolute',
      },
    },
    '@layer site': {
      flexShrink: '0',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':is([data-on="true"])': 'var(--primary)',
      },
      cursor: 'pointer',
    },
    width: {
      default: null,
      '@layer site': '36px',
      '::after': {
        default: null,
        '@layer site': '14px',
      },
    },
    height: {
      default: null,
      '@layer site': '20px',
      '::after': {
        default: null,
        '@layer site': '14px',
      },
    },
    borderRadius: {
      default: null,
      '@layer site': '999px',
      '::after': {
        default: null,
        '@layer site': '50%',
      },
    },
    backgroundColor: {
      default: null,
      '@layer site': {
        default: 'var(--bg-2)',
        ':is([data-on="true"])': 'var(--primary)',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'var(--ink-3)',
          ':is([data-on="true"])': '#fff',
        },
      },
    },
    backgroundImage: {
      default: null,
      '@layer site': 'none',
      '::after': {
        default: null,
        '@layer site': 'none',
      },
    },
    backgroundPosition: {
      default: null,
      '@layer site': 'initial',
      '::after': {
        default: null,
        '@layer site': 'initial',
      },
    },
    backgroundSize: {
      default: null,
      '@layer site': 'auto',
      '::after': {
        default: null,
        '@layer site': 'auto',
      },
    },
    backgroundRepeat: {
      default: null,
      '@layer site': 'repeat',
      '::after': {
        default: null,
        '@layer site': 'repeat',
      },
    },
    backgroundOrigin: {
      default: null,
      '@layer site': 'padding-box',
      '::after': {
        default: null,
        '@layer site': 'padding-box',
      },
    },
    backgroundClip: {
      default: null,
      '@layer site': 'border-box',
      '::after': {
        default: null,
        '@layer site': 'border-box',
      },
    },
    backgroundAttachment: {
      default: null,
      '@layer site': 'scroll',
      '::after': {
        default: null,
        '@layer site': 'scroll',
      },
    },
    transition: {
      default: null,
      '@layer site': 'background 200ms',
      '::after': {
        default: null,
        '@layer site': 'all 200ms',
      },
    },
    content: {
      default: null,
      '::after': {
        default: null,
        '@layer site': "''",
      },
    },
    top: {
      default: null,
      '::after': {
        default: null,
        '@layer site': '2px',
      },
    },
    left: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: '2px',
          ':is([data-on="true"])': '18px',
        },
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const tweaks_panel = stylex.props(styles.tweaks_panel).className!
export const tweaks_handle = stylex.props(styles.tweaks_handle).className!
export const element_h3 = stylex.props(styles.element_h3).className!
export const x = stylex.props(styles.x).className!
export const element_label = stylex.props(styles.element_label).className!
export const tweaks_label = stylex.props(styles.tweaks_label).className!
export const tweaks_row_next = stylex.props(styles.tweaks_row_next).className!
export const tweaks_swatches = stylex.props(styles.tweaks_swatches).className!
export const tweaks_sw = stylex.props(styles.tweaks_sw).className!
export const tweaks_theme = stylex.props(styles.tweaks_theme).className!
export const tweaks_theme_btn = stylex.props(styles.tweaks_theme_btn).className!
export const element_input = stylex.props(styles.element_input).className!
export const tweaks_val = stylex.props(styles.tweaks_val).className!
export const tweaks_toggle = stylex.props(styles.tweaks_toggle).className!
export const tweaks_switch = stylex.props(styles.tweaks_switch).className!
