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
      borderTopWidth: {
        default: '1px',
        '@media (max-width: 639px)': '1px',
      },
      borderTopStyle: {
        default: 'solid',
        '@media (max-width: 639px)': 'solid',
      },
      borderTopColor: {
        default: 'var(--border-2)',
        '@media (max-width: 639px)': 'var(--border-2)',
      },
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
      backgroundImage: {
        default: 'none',
        '@supports (color: color-mix(in lab, red, red))': 'none',
        '@media (max-width: 639px)': 'none',
      },
      backgroundPosition: {
        default: 'initial',
        '@supports (color: color-mix(in lab, red, red))': 'initial',
        '@media (max-width: 639px)': 'initial',
      },
      backgroundSize: {
        default: 'auto',
        '@supports (color: color-mix(in lab, red, red))': 'auto',
        '@media (max-width: 639px)': 'auto',
      },
      backgroundRepeat: {
        default: 'repeat',
        '@supports (color: color-mix(in lab, red, red))': 'repeat',
        '@media (max-width: 639px)': 'repeat',
      },
      backgroundOrigin: {
        default: 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': 'padding-box',
        '@media (max-width: 639px)': 'padding-box',
      },
      backgroundClip: {
        default: 'border-box',
        '@supports (color: color-mix(in lab, red, red))': 'border-box',
        '@media (max-width: 639px)': 'border-box',
      },
      backgroundAttachment: {
        default: 'scroll',
        '@supports (color: color-mix(in lab, red, red))': 'scroll',
        '@media (max-width: 639px)': 'scroll',
      },
      fontSize: '13px',
      color: 'var(--ink)',
      transform: {
        default: 'translateY(-14px) scale(0.94)',
        ":is(.tweaks-panel[data-open='true'])": 'none',
        '@media (max-width: 639px)': {
          default: 'translateY(100%)',
          ":is(.tweaks-panel[data-open='true'])": 'none',
        },
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
        ":is(.tweaks-panel[data-open='true'])": '1',
      },
      pointerEvents: {
        default: 'none',
        ":is(.tweaks-panel[data-open='true'])": 'auto',
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
      display: {
        default: null,
        ':is(.tweaks-panel h3)': 'flex',
      },
      alignItems: {
        default: null,
        ':is(.tweaks-panel h3)': 'center',
      },
      justifyContent: {
        default: null,
        ':is(.tweaks-panel h3)': 'space-between',
      },
      marginBottom: {
        default: null,
        ':is(.tweaks-panel h3)': '14px',
      },
      fontSize: {
        default: null,
        ':is(.tweaks-panel h3)': '14px',
      },
      fontWeight: {
        default: null,
        ':is(.tweaks-panel h3)': '700',
      },
    },
  },
  x: {
    '@layer site': {
      padding: {
        default: null,
        ':is(.tweaks-panel .x)': '0 4px',
      },
      fontSize: {
        default: null,
        ':is(.tweaks-panel .x)': '22px',
      },
      lineHeight: {
        default: null,
        ':is(.tweaks-panel .x)': '1',
      },
      color: {
        default: null,
        ':is(.tweaks-panel .x)': 'var(--ink-3)',
      },
      cursor: {
        default: null,
        ':is(.tweaks-panel .x)': 'pointer',
      },
    },
  },
  element_label: {
    '@layer site': {
      display: {
        default: null,
        ':is(.tweaks-panel label)': 'block',
      },
      marginBottom: {
        default: null,
        ':is(.tweaks-panel label)': '8px',
      },
      fontFamily: {
        default: null,
        ':is(.tweaks-panel label)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.tweaks-panel label)': '10px',
      },
      letterSpacing: {
        default: null,
        ':is(.tweaks-panel label)': '0.08em',
      },
      textTransform: {
        default: null,
        ':is(.tweaks-panel label)': 'uppercase',
      },
      color: {
        default: null,
        ':is(.tweaks-panel label)': 'var(--ink-3)',
      },
    },
  },
  tweaks_label: {
    '@layer site': {
      display: {
        default: null,
        ':is(.tweaks-panel .tweaks-label)': 'block',
      },
      marginBottom: {
        default: null,
        ':is(.tweaks-panel .tweaks-label)': '8px',
      },
      fontFamily: {
        default: null,
        ':is(.tweaks-panel .tweaks-label)': 'var(--font-mono), monospace',
      },
      fontSize: {
        default: null,
        ':is(.tweaks-panel .tweaks-label)': '10px',
      },
      letterSpacing: {
        default: null,
        ':is(.tweaks-panel .tweaks-label)': '0.08em',
      },
      textTransform: {
        default: null,
        ':is(.tweaks-panel .tweaks-label)': 'uppercase',
      },
      color: {
        default: null,
        ':is(.tweaks-panel .tweaks-label)': 'var(--ink-3)',
      },
    },
  },
  tweaks_row: {
    '@layer site': {
      marginTop: {
        default: null,
        ':is(.tweaks-row + .tweaks-row)': '16px',
      },
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
      borderTopWidth: '2px',
      borderTopStyle: 'solid',
      borderTopColor: {
        default: 'transparent',
        ":is(.tweaks-sw[data-on='true'])": 'var(--ink)',
      },
      borderRightWidth: '2px',
      borderRightStyle: 'solid',
      borderRightColor: {
        default: 'transparent',
        ":is(.tweaks-sw[data-on='true'])": 'var(--ink)',
      },
      borderBottomWidth: '2px',
      borderBottomStyle: 'solid',
      borderBottomColor: {
        default: 'transparent',
        ":is(.tweaks-sw[data-on='true'])": 'var(--ink)',
      },
      borderLeftWidth: '2px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'transparent',
        ":is(.tweaks-sw[data-on='true'])": 'var(--ink)',
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
      borderRadius: '10px',
      backgroundColor: {
        default: 'var(--surface-2)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface-2) 70%, transparent)',
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
        ":is(.tweaks-theme-btn[data-on='true'])": 'var(--primary)',
      },
      transition:
        'color 160ms ease,\n    background-color 180ms ease,\n    box-shadow 180ms ease',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface) 70%, transparent)',
          ":is(.tweaks-theme-btn[data-on='true'])":
            'color-mix(in oklab, var(--primary) 14%, var(--surface))',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'var(--primary)',
      },
      backgroundImage: {
        default: null,
        ':hover': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'none',
          ":is(.tweaks-theme-btn[data-on='true'])": 'none',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'none',
      },
      backgroundPosition: {
        default: null,
        ':hover': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'initial',
          ":is(.tweaks-theme-btn[data-on='true'])": 'initial',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'initial',
      },
      backgroundSize: {
        default: null,
        ':hover': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'auto',
          ":is(.tweaks-theme-btn[data-on='true'])": 'auto',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':hover': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'repeat',
          ":is(.tweaks-theme-btn[data-on='true'])": 'repeat',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':hover': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'padding-box',
          ":is(.tweaks-theme-btn[data-on='true'])": 'padding-box',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':hover': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'border-box',
          ":is(.tweaks-theme-btn[data-on='true'])": 'border-box',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':hover': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'scroll',
          ":is(.tweaks-theme-btn[data-on='true'])": 'scroll',
        },
        ":is(.tweaks-theme-btn[data-on='true'])": 'scroll',
      },
      boxShadow: {
        default: null,
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ":is(.tweaks-theme-btn[data-on='true'])":
            'inset 0 0 0 1px color-mix(in oklab, var(--primary) 35%, transparent)',
        },
        ":is(.tweaks-theme-btn[data-on='true'])":
          'inset 0 0 0 1px var(--primary)',
      },
    },
  },
  element_input: {
    '@layer site': {
      width: {
        default: null,
        ":is(.tweaks-panel input[type='range'])": '100%',
      },
      accentColor: {
        default: null,
        ":is(.tweaks-panel input[type='range'])": 'var(--primary)',
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
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: {
        default: 'var(--border)',
        ":is(.tweaks-switch[data-on='true'])": 'var(--primary)',
      },
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: {
        default: 'var(--border)',
        ":is(.tweaks-switch[data-on='true'])": 'var(--primary)',
      },
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: {
        default: 'var(--border)',
        ":is(.tweaks-switch[data-on='true'])": 'var(--primary)',
      },
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'var(--border)',
        ":is(.tweaks-switch[data-on='true'])": 'var(--primary)',
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
        ":is(.tweaks-switch[data-on='true'])": 'var(--primary)',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'var(--ink-3)',
          ":is(.tweaks-switch[data-on='true'])": '#fff',
        },
      },
    },
    backgroundImage: {
      default: null,
      '@layer site': {
        default: 'none',
        ":is(.tweaks-switch[data-on='true'])": 'none',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'none',
          ":is(.tweaks-switch[data-on='true'])": 'none',
        },
      },
    },
    backgroundPosition: {
      default: null,
      '@layer site': {
        default: 'initial',
        ":is(.tweaks-switch[data-on='true'])": 'initial',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'initial',
          ":is(.tweaks-switch[data-on='true'])": 'initial',
        },
      },
    },
    backgroundSize: {
      default: null,
      '@layer site': {
        default: 'auto',
        ":is(.tweaks-switch[data-on='true'])": 'auto',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'auto',
          ":is(.tweaks-switch[data-on='true'])": 'auto',
        },
      },
    },
    backgroundRepeat: {
      default: null,
      '@layer site': {
        default: 'repeat',
        ":is(.tweaks-switch[data-on='true'])": 'repeat',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'repeat',
          ":is(.tweaks-switch[data-on='true'])": 'repeat',
        },
      },
    },
    backgroundOrigin: {
      default: null,
      '@layer site': {
        default: 'padding-box',
        ":is(.tweaks-switch[data-on='true'])": 'padding-box',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'padding-box',
          ":is(.tweaks-switch[data-on='true'])": 'padding-box',
        },
      },
    },
    backgroundClip: {
      default: null,
      '@layer site': {
        default: 'border-box',
        ":is(.tweaks-switch[data-on='true'])": 'border-box',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'border-box',
          ":is(.tweaks-switch[data-on='true'])": 'border-box',
        },
      },
    },
    backgroundAttachment: {
      default: null,
      '@layer site': {
        default: 'scroll',
        ":is(.tweaks-switch[data-on='true'])": 'scroll',
      },
      '::after': {
        default: null,
        '@layer site': {
          default: 'scroll',
          ":is(.tweaks-switch[data-on='true'])": 'scroll',
        },
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
          ":is(.tweaks-switch[data-on='true'])": '18px',
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
export const tweaks_row = stylex.props(styles.tweaks_row).className!
export const tweaks_swatches = stylex.props(styles.tweaks_swatches).className!
export const tweaks_sw = stylex.props(styles.tweaks_sw).className!
export const tweaks_theme = stylex.props(styles.tweaks_theme).className!
export const tweaks_theme_btn = stylex.props(styles.tweaks_theme_btn).className!
export const element_input = stylex.props(styles.element_input).className!
export const tweaks_val = stylex.props(styles.tweaks_val).className!
export const tweaks_toggle = stylex.props(styles.tweaks_toggle).className!
export const tweaks_switch = stylex.props(styles.tweaks_switch).className!
