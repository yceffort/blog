import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  post_row_list: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: 'var(--border)',
    },
  },
  element_li: {
    '@layer site': {
      borderBottomWidth: {
        default: null,
        ':is(.post-row-list > li)': '1px',
      },
      borderBottomStyle: {
        default: null,
        ':is(.post-row-list > li)': 'solid',
      },
      borderBottomColor: {
        default: null,
        ':is(.post-row-list > li)': 'var(--border)',
      },
    },
  },
  post_row: {
    '@layer site': {
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: {
        default: '96px 1fr 24px',
        '@media (max-width: 640px)': '72px 1fr',
      },
      alignItems: 'center',
      gap: {
        default: '20px',
        '@media (max-width: 640px)': '14px',
      },
      padding: {
        default: '18px 14px',
        '@media (max-width: 640px)': '14px 8px',
      },
      transition:
        'background-color 200ms ease,\n    transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1)',
      backgroundColor: {
        default: null,
        ':hover': 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--surface) 60%, transparent)',
        },
      },
      backgroundImage: {
        default: null,
        ':hover': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'none',
        },
      },
      backgroundPosition: {
        default: null,
        ':hover': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'initial',
        },
      },
      backgroundSize: {
        default: null,
        ':hover': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'auto',
        },
      },
      backgroundRepeat: {
        default: null,
        ':hover': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'repeat',
        },
      },
      backgroundOrigin: {
        default: null,
        ':hover': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'padding-box',
        },
      },
      backgroundClip: {
        default: null,
        ':hover': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'border-box',
        },
      },
      backgroundAttachment: {
        default: null,
        ':hover': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'scroll',
        },
      },
    },
  },
  post_row_link: {
    '@layer site': {
      position: 'absolute',
      inset: '0',
      zIndex: '3',
    },
  },
  post_row_thumb: {
    '@layer site': {
      overflow: 'hidden',
      position: 'relative',
      width: {
        default: '96px',
        '@media (max-width: 640px)': '72px',
      },
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
      backgroundColor: 'var(--surface-2)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
      aspectRatio: '3 / 2',
    },
  },
  element_img: {
    '@layer site': {
      objectFit: {
        default: null,
        ':is(.post-row-thumb img)': 'cover',
        ':is(.post-card .thumb img)': 'cover',
      },
      transition: {
        default: null,
        ':is(.post-card .thumb img)':
          'transform 700ms cubic-bezier(0.2, 0.9, 0.2, 1)',
      },
      transform: {
        default: null,
        ':is(.post-card:hover .thumb img)': 'scale(1.05)',
      },
    },
  },
  post_row_thumb_empty: {
    '@layer site': {
      display: 'grid',
      placeItems: 'center',
      backgroundColor: {
        default: 'transparent',
        '@supports (color: color-mix(in lab, red, red))': 'transparent',
      },
      backgroundImage: {
        default:
          'linear-gradient(\n    135deg,\n    var(--primary),\n    var(--primary-3)\n  )',
        '@supports (color: color-mix(in lab, red, red))':
          'linear-gradient(\n    135deg,\n    color-mix(in oklab, var(--primary) 10%, var(--surface-2)),\n    color-mix(in oklab, var(--primary-3) 7%, var(--surface-2))\n  )',
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
      color: 'var(--ink-3)',
    },
  },
  element_svg: {
    '@layer site': {
      width: {
        default: null,
        ':is(.post-row-thumb-empty svg)': '60%',
      },
      height: {
        default: null,
        ':is(.post-row-thumb-empty svg)': 'auto',
      },
      color: {
        default: null,
        ':is(.post-row-thumb-empty svg)': 'var(--ink-4)',
      },
    },
  },
  post_row_body: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      minWidth: '0',
      gap: '6px',
    },
  },
  post_row_head: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '8px',
    },
  },
  series: {
    '@layer site': {
      fontSize: {
        default: null,
        ':is(.post-row .series)': '12px',
        ':is(.post-card .series)': '11.5px',
      },
      fontWeight: {
        default: null,
        ':is(.post-row .series)': '500',
        ':is(.post-card .series)': '500',
      },
      lineHeight: {
        default: null,
        ':is(.post-row .series)': '1.4',
      },
      color: {
        default: null,
        ':is(.post-row .series)': 'var(--ink-3)',
        ':is(.post-card .series)': '#22c55e',
      },
      display: {
        default: null,
        ':is(.post-card .series)': 'inline-flex',
      },
      alignItems: {
        default: null,
        ':is(.post-card .series)': 'center',
      },
      width: {
        default: null,
        ':is(.post-card .series)': 'fit-content',
      },
      padding: {
        default: null,
        ':is(.post-card .series)': '3px 9px',
      },
      borderTopWidth: {
        default: null,
        ':is(.post-card .series)': '1px',
      },
      borderTopStyle: {
        default: null,
        ':is(.post-card .series)': 'solid',
      },
      borderTopColor: {
        default: null,
        ':is(.post-card .series)':
          'color-mix(in oklab, #22c55e 30%, transparent)',
      },
      borderRightWidth: {
        default: null,
        ':is(.post-card .series)': '1px',
      },
      borderRightStyle: {
        default: null,
        ':is(.post-card .series)': 'solid',
      },
      borderRightColor: {
        default: null,
        ':is(.post-card .series)':
          'color-mix(in oklab, #22c55e 30%, transparent)',
      },
      borderBottomWidth: {
        default: null,
        ':is(.post-card .series)': '1px',
      },
      borderBottomStyle: {
        default: null,
        ':is(.post-card .series)': 'solid',
      },
      borderBottomColor: {
        default: null,
        ':is(.post-card .series)':
          'color-mix(in oklab, #22c55e 30%, transparent)',
      },
      borderLeftWidth: {
        default: null,
        ':is(.post-card .series)': '1px',
      },
      borderLeftStyle: {
        default: null,
        ':is(.post-card .series)': 'solid',
      },
      borderLeftColor: {
        default: null,
        ':is(.post-card .series)':
          'color-mix(in oklab, #22c55e 30%, transparent)',
      },
      borderRadius: {
        default: null,
        ':is(.post-card .series)': '999px',
      },
      backgroundColor: {
        default: null,
        ':is(.post-card .series)': '#22c55e',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)':
            'color-mix(in oklab, #22c55e 12%, var(--surface))',
        },
      },
      backgroundImage: {
        default: null,
        ':is(.post-card .series)': 'none',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)': 'none',
        },
      },
      backgroundPosition: {
        default: null,
        ':is(.post-card .series)': 'initial',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)': 'initial',
        },
      },
      backgroundSize: {
        default: null,
        ':is(.post-card .series)': 'auto',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)': 'auto',
        },
      },
      backgroundRepeat: {
        default: null,
        ':is(.post-card .series)': 'repeat',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)': 'repeat',
        },
      },
      backgroundOrigin: {
        default: null,
        ':is(.post-card .series)': 'padding-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)': 'padding-box',
        },
      },
      backgroundClip: {
        default: null,
        ':is(.post-card .series)': 'border-box',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)': 'border-box',
        },
      },
      backgroundAttachment: {
        default: null,
        ':is(.post-card .series)': 'scroll',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':is(.post-card .series)': 'scroll',
        },
      },
      transform: {
        default: null,
        ':is(.post-card .series)': 'translateZ(14px)',
      },
      gap: {
        default: null,
        ':is(.post-card .series)': '6px',
      },
    },
  },
  post_row_tags: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    },
  },
  post_row_title: {
    '@layer site': {
      overflow: 'hidden',
      display: '-webkit-box',
      fontSize: {
        default: '17px',
        '@media (max-width: 640px)': '15.5px',
      },
      fontWeight: '700',
      lineHeight: '1.35',
      letterSpacing: '-0.015em',
      color: {
        default: 'var(--ink)',
        ':is(.post-row:hover .post-row-title)': 'var(--primary)',
      },
      WebkitLineClamp: {
        default: '2',
        '@media (max-width: 640px)': '3',
      },
      WebkitBoxOrient: 'vertical',
    },
  },
  post_row_desc: {
    '@layer site': {
      overflow: 'hidden',
      display: {
        default: '-webkit-box',
        '@media (max-width: 640px)': 'none',
      },
      fontSize: '13px',
      lineHeight: '1.55',
      color: 'var(--ink-3)',
      WebkitLineClamp: '1',
      WebkitBoxOrient: 'vertical',
    },
  },
  post_row_meta: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      marginTop: '2px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.02em',
      color: 'var(--ink-4)',
      gap: '6px',
    },
  },
  post_row_arrow: {
    '@layer site': {
      color: {
        default: 'var(--ink-4)',
        ':is(.post-row:hover .post-row-arrow)': 'var(--primary)',
      },
      transition:
        'transform 220ms cubic-bezier(0.2, 0.9, 0.2, 1),\n    color 180ms ease',
      transform: {
        default: null,
        ':is(.post-row:hover .post-row-arrow)': 'translateX(3px)',
      },
      display: {
        default: null,
        '@media (max-width: 640px)': 'none',
      },
    },
  },
  post_card: {
    '@layer site': {
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
        },
      },
      transformStyle: 'preserve-3d',
      willChange: 'transform',
      boxShadow: {
        default: null,
        ':hover': '0 10px 40px -20px\n    var(--primary)',
        '@supports (color: color-mix(in lab, red, red))': {
          default: null,
          ':hover':
            '0 10px 40px -20px\n    color-mix(in oklab, var(--primary) 80%, transparent)',
        },
      },
    },
    position: {
      default: null,
      '@layer site': 'relative',
      '::after': {
        default: null,
        '@layer site': 'absolute',
      },
    },
    borderRadius: {
      default: null,
      '@layer site': 'var(--radius)',
      '::after': {
        default: null,
        '@layer site': 'inherit',
      },
    },
    backgroundColor: {
      default: null,
      '@layer site': 'var(--surface)',
      '::after': {
        default: null,
        '@layer site': {
          default: 'transparent',
          '@supports (color: color-mix(in lab, red, red))': 'transparent',
        },
      },
    },
    backgroundImage: {
      default: null,
      '@layer site': 'none',
      '::after': {
        default: null,
        '@layer site': {
          default:
            'radial-gradient(\n    400px circle at var(--mx, 50%) var(--my, 50%),\n    var(--primary) 0%,\n    transparent 45%\n  )',
          '@supports (color: color-mix(in lab, red, red))':
            'radial-gradient(\n    400px circle at var(--mx, 50%) var(--my, 50%),\n    color-mix(in oklab, var(--primary) 10%, transparent) 0%,\n    transparent 45%\n  )',
        },
      },
    },
    backgroundPosition: {
      default: null,
      '@layer site': 'initial',
      '::after': {
        default: null,
        '@layer site': {
          default: 'initial',
          '@supports (color: color-mix(in lab, red, red))': 'initial',
        },
      },
    },
    backgroundSize: {
      default: null,
      '@layer site': 'auto',
      '::after': {
        default: null,
        '@layer site': {
          default: 'auto',
          '@supports (color: color-mix(in lab, red, red))': 'auto',
        },
      },
    },
    backgroundRepeat: {
      default: null,
      '@layer site': 'repeat',
      '::after': {
        default: null,
        '@layer site': {
          default: 'repeat',
          '@supports (color: color-mix(in lab, red, red))': 'repeat',
        },
      },
    },
    backgroundOrigin: {
      default: null,
      '@layer site': 'padding-box',
      '::after': {
        default: null,
        '@layer site': {
          default: 'padding-box',
          '@supports (color: color-mix(in lab, red, red))': 'padding-box',
        },
      },
    },
    backgroundClip: {
      default: null,
      '@layer site': 'border-box',
      '::after': {
        default: null,
        '@layer site': {
          default: 'border-box',
          '@supports (color: color-mix(in lab, red, red))': 'border-box',
        },
      },
    },
    backgroundAttachment: {
      default: null,
      '@layer site': 'scroll',
      '::after': {
        default: null,
        '@layer site': {
          default: 'scroll',
          '@supports (color: color-mix(in lab, red, red))': 'scroll',
        },
      },
    },
    transition: {
      default: null,
      '@layer site': 'border-color 300ms,\n    box-shadow 300ms',
      '::after': {
        default: null,
        '@layer site': 'opacity 300ms',
      },
    },
    content: {
      default: null,
      '::after': {
        default: null,
        '@layer site': "''",
      },
    },
    opacity: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: '0',
          ':hover': '1',
        },
      },
    },
    inset: {
      default: null,
      '::after': {
        default: null,
        '@layer site': '0',
      },
    },
    pointerEvents: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'none',
      },
    },
  },
  element_a: {
    '@layer site': {
      position: {
        default: null,
        ':is(.post-card > a)': 'absolute',
      },
      inset: {
        default: null,
        ':is(.post-card > a)': '0',
      },
      zIndex: {
        default: null,
        ':is(.post-card > a)': '3',
      },
    },
  },
  thumb: {
    '@layer site': {
      overflow: {
        default: null,
        ':is(.post-card .thumb)': 'hidden',
      },
      position: {
        default: null,
        ':is(.post-card .thumb)': 'relative',
      },
      borderBottomWidth: {
        default: null,
        ':is(.post-card .thumb)': '1px',
      },
      borderBottomStyle: {
        default: null,
        ':is(.post-card .thumb)': 'solid',
      },
      borderBottomColor: {
        default: null,
        ':is(.post-card .thumb)': 'var(--border)',
      },
      backgroundColor: {
        default: null,
        ':is(.post-card .thumb)': 'var(--surface-2)',
      },
      backgroundImage: {
        default: null,
        ':is(.post-card .thumb)': 'none',
      },
      backgroundPosition: {
        default: null,
        ':is(.post-card .thumb)': 'initial',
      },
      backgroundSize: {
        default: null,
        ':is(.post-card .thumb)': 'auto',
      },
      backgroundRepeat: {
        default: null,
        ':is(.post-card .thumb)': 'repeat',
      },
      backgroundOrigin: {
        default: null,
        ':is(.post-card .thumb)': 'padding-box',
      },
      backgroundClip: {
        default: null,
        ':is(.post-card .thumb)': 'border-box',
      },
      backgroundAttachment: {
        default: null,
        ':is(.post-card .thumb)': 'scroll',
      },
      aspectRatio: {
        default: null,
        ':is(.post-card .thumb)': '16 / 9',
      },
    },
  },
  body: {
    '@layer site': {
      display: {
        default: null,
        ':is(.post-card .body)': 'flex',
      },
      flex: {
        default: null,
        ':is(.post-card .body)': '1',
      },
      flexDirection: {
        default: null,
        ':is(.post-card .body)': 'column',
      },
      padding: {
        default: null,
        ':is(.post-card .body)': '18px 20px 20px',
      },
      gap: {
        default: null,
        ':is(.post-card .body)': '10px',
      },
    },
  },
  tag_row: {
    '@layer site': {
      display: {
        default: null,
        ':is(.post-card .tag-row)': 'flex',
      },
      flexWrap: {
        default: null,
        ':is(.post-card .tag-row)': 'wrap',
      },
      gap: {
        default: null,
        ':is(.post-card .tag-row)': '6px',
      },
      transform: {
        default: null,
        ':is(.post-card .tag-row)': 'translateZ(12px)',
      },
    },
  },
  element_h3: {
    '@layer site': {
      overflow: {
        default: null,
        ':is(.post-card h3)': 'hidden',
      },
      display: {
        default: null,
        ':is(.post-card h3)': '-webkit-box',
      },
      marginTop: {
        default: null,
        ':is(.post-card h3)': '2px',
      },
      fontSize: {
        default: null,
        ':is(.post-card h3)': '17px',
      },
      fontWeight: {
        default: null,
        ':is(.post-card h3)': '700',
      },
      lineHeight: {
        default: null,
        ':is(.post-card h3)': '1.35',
      },
      letterSpacing: {
        default: null,
        ':is(.post-card h3)': '-0.015em',
      },
      color: {
        default: null,
        ':is(.post-card h3)': 'var(--ink)',
      },
      transform: {
        default: null,
        ':is(.post-card h3)': 'translateZ(20px)',
      },
      WebkitLineClamp: {
        default: null,
        ':is(.post-card h3)': '2',
      },
      WebkitBoxOrient: {
        default: null,
        ':is(.post-card h3)': 'vertical',
      },
    },
  },
  desc: {
    '@layer site': {
      overflow: {
        default: null,
        ':is(.post-card p.desc)': 'hidden',
      },
      display: {
        default: null,
        ':is(.post-card p.desc)': '-webkit-box',
      },
      fontSize: {
        default: null,
        ':is(.post-card p.desc)': '13px',
      },
      lineHeight: {
        default: null,
        ':is(.post-card p.desc)': '1.55',
      },
      color: {
        default: null,
        ':is(.post-card p.desc)': 'var(--ink-3)',
      },
      transform: {
        default: null,
        ':is(.post-card p.desc)': 'translateZ(8px)',
      },
      WebkitLineClamp: {
        default: null,
        ':is(.post-card p.desc)': '2',
      },
      WebkitBoxOrient: {
        default: null,
        ':is(.post-card p.desc)': 'vertical',
      },
    },
  },
  meta: {
    '@layer site': {
      display: {
        default: null,
        ':is(.post-card .meta)': 'flex',
      },
      alignItems: {
        default: null,
        ':is(.post-card .meta)': 'center',
      },
      marginTop: {
        default: null,
        ':is(.post-card .meta)': 'auto',
      },
      paddingTop: {
        default: null,
        ':is(.post-card .meta)': '10px',
      },
      fontSize: {
        default: null,
        ':is(.post-card .meta)': '12px',
      },
      color: {
        default: null,
        ':is(.post-card .meta)': 'var(--ink-4)',
      },
      transform: {
        default: null,
        ':is(.post-card .meta)': 'translateZ(6px)',
      },
      gap: {
        default: null,
        ':is(.post-card .meta)': '6px',
      },
    },
  },
  tag_chip: {
    '@layer site': {
      padding: '3px 9px',
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
      borderRadius: '999px',
      backgroundColor: 'var(--surface-2)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
      fontSize: '11px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      color: 'var(--ink-2)',
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const post_row_list = stylex.props(styles.post_row_list).className!
export const element_li = stylex.props(styles.element_li).className!
export const post_row = stylex.props(styles.post_row).className!
export const post_row_link = stylex.props(styles.post_row_link).className!
export const post_row_thumb = stylex.props(styles.post_row_thumb).className!
export const element_img = stylex.props(styles.element_img).className!
export const post_row_thumb_empty = stylex.props(
  styles.post_row_thumb_empty,
).className!
export const element_svg = stylex.props(styles.element_svg).className!
export const post_row_body = stylex.props(styles.post_row_body).className!
export const post_row_head = stylex.props(styles.post_row_head).className!
export const series = stylex.props(styles.series).className!
export const post_row_tags = stylex.props(styles.post_row_tags).className!
export const post_row_title = stylex.props(styles.post_row_title).className!
export const post_row_desc = stylex.props(styles.post_row_desc).className!
export const post_row_meta = stylex.props(styles.post_row_meta).className!
export const post_row_arrow = stylex.props(styles.post_row_arrow).className!
export const post_card = stylex.props(styles.post_card).className!
export const element_a = stylex.props(styles.element_a).className!
export const thumb = stylex.props(styles.thumb).className!
export const body = stylex.props(styles.body).className!
export const tag_row = stylex.props(styles.tag_row).className!
export const element_h3 = stylex.props(styles.element_h3).className!
export const desc = stylex.props(styles.desc).className!
export const meta = stylex.props(styles.meta).className!
export const tag_chip = stylex.props(styles.tag_chip).className!
