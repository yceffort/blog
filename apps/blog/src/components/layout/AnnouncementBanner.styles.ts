import * as stylex from '@stylexjs/stylex'
const pingAnimation = stylex.keyframes({
  '75%': {
    transform: 'scale(2)',
    opacity: '0',
  },
  '100%': {
    transform: 'scale(2)',
    opacity: '0',
  },
})
const sx = stylex.create({
  div: {
    '@layer utilities': {
      pointerEvents: 'none',
      position: 'fixed',
      insetInline: '0px',
      bottom: {
        default: 'calc(var(--spacing) * 4)',
        '@media (width >= 40rem)': 'calc(var(--spacing) * 6)',
      },
      zIndex: '50',
      display: 'flex',
      justifyContent: 'center',
      paddingInline: 'calc(var(--spacing) * 4)',
    },
  },
  div2: {
    '@layer utilities': {
      pointerEvents: 'auto',
      position: 'relative',
      width: '100%',
      maxWidth: 'var(--container-xl)',
      overflow: 'hidden',
      borderRadius: 'var(--radius-2xl)',
      backgroundColor: 'var(--ink)',
      color: 'var(--surface)',
      '--blog-shadow':
        '0 24px 48px -16px var(--blog-shadow-color, rgba(0,0,0,0.6))',
      boxShadow:
        'var(--blog-inset-shadow), var(--blog-inset-ring-shadow), var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
      '--blog-ring-shadow':
        'var(--blog-ring-inset,) 0 0 0 calc(1px + var(--blog-ring-offset-width)) var(--blog-ring-color, currentcolor)',
      '--blog-ring-color': {
        default: 'color-mix(in srgb, #fff 10%, transparent)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--color-white) 10%, transparent)',
      },
    },
  },
  div3: {
    '@layer utilities': {
      pointerEvents: 'none',
      position: 'absolute',
      top: 'calc(var(--spacing) * -16)',
      right: 'calc(var(--spacing) * -10)',
      width: 'calc(var(--spacing) * 48)',
      height: 'calc(var(--spacing) * 48)',
      borderRadius: 'calc(infinity * 1px)',
      '--blog-gradient-position': 'to bottom right in oklab',
      backgroundImage: 'linear-gradient(var(--blog-gradient-stops))',
      '--blog-gradient-from': 'var(--primary)',
      '--blog-gradient-stops':
        'var(--blog-gradient-via-stops, var(--blog-gradient-position), var(--blog-gradient-from) var(--blog-gradient-from-position), var(--blog-gradient-to) var(--blog-gradient-to-position))',
      '--blog-gradient-via': 'var(--primary-2)',
      '--blog-gradient-via-stops':
        'var(--blog-gradient-position), var(--blog-gradient-from) var(--blog-gradient-from-position), var(--blog-gradient-via) var(--blog-gradient-via-position), var(--blog-gradient-to) var(--blog-gradient-to-position)',
      '--blog-gradient-to': 'var(--primary-3)',
      opacity: '40%',
      '--blog-blur': 'blur(var(--blur-3xl))',
      filter:
        'var(--blog-blur,) var(--blog-brightness,) var(--blog-contrast,) var(--blog-grayscale,) var(--blog-hue-rotate,) var(--blog-invert,) var(--blog-saturate,) var(--blog-sepia,) var(--blog-drop-shadow,)',
    },
  },
  div4: {
    '@layer utilities': {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 'calc(var(--spacing) * 4)',
      paddingInline: 'calc(var(--spacing) * 5)',
      paddingBlock: 'calc(var(--spacing) * 4)',
    },
  },
  link: {
    '@layer utilities': {
      minWidth: '0px',
      flex: '1',
      '--announcement-link-translate': {
        default: null,
        '@media (hover: hover)': {
          default: null,
          ':hover': 'calc(var(--spacing) * 0.5) var(--blog-translate-y)',
        },
      },
    },
  },
  span: {
    '@layer utilities': {
      display: 'flex',
      alignItems: 'center',
      gap: 'calc(var(--spacing) * 2)',
    },
  },
  span2: {
    '@layer utilities': {
      position: 'relative',
      display: 'flex',
      width: 'calc(var(--spacing) * 2)',
      height: 'calc(var(--spacing) * 2)',
      flexShrink: '0',
    },
  },
  span3: {
    '@layer utilities': {
      position: 'absolute',
      display: 'inline-flex',
      width: '100%',
      height: '100%',
      borderRadius: 'calc(infinity * 1px)',
      backgroundColor: 'var(--primary-3)',
      opacity: '75%',
      animationName: {
        default: null,
        '@media (prefers-reduced-motion: no-preference)': pingAnimation,
      },
      animationDuration: {
        default: null,
        '@media (prefers-reduced-motion: no-preference)': '1s',
      },
      animationTimingFunction: {
        default: null,
        '@media (prefers-reduced-motion: no-preference)':
          'cubic-bezier(0, 0, 0.2, 1)',
      },
      animationIterationCount: {
        default: null,
        '@media (prefers-reduced-motion: no-preference)': 'infinite',
      },
    },
  },
  span4: {
    '@layer utilities': {
      position: 'relative',
      display: 'inline-flex',
      width: 'calc(var(--spacing) * 2)',
      height: 'calc(var(--spacing) * 2)',
      borderRadius: 'calc(infinity * 1px)',
      backgroundColor: 'var(--primary-3)',
    },
  },
  span5: {
    '@layer utilities': {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      fontWeight: 'var(--font-weight-bold)',
      letterSpacing: 'var(--tracking-wider)',
      color: 'var(--primary-2)',
      textTransform: 'uppercase',
    },
  },
  span6: {
    '@layer utilities': {
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      color: {
        default: 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface) 60%, transparent)',
      },
    },
  },
  span7: {
    '@layer utilities': {
      marginTop: 'calc(var(--spacing) * 1.5)',
      display: 'block',
      fontSize: '15px',
      '--blog-leading': 'var(--leading-snug)',
      lineHeight: 'var(--leading-snug)',
      fontWeight: 'var(--font-weight-semibold)',
    },
  },
  span8: {
    '@layer utilities': {
      fontWeight: 'var(--font-weight-normal)',
      color: {
        default: 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface) 80%, transparent)',
      },
    },
  },
  span9: {
    '@layer utilities': {
      marginTop: 'calc(var(--spacing) * 2.5)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--spacing)',
      borderRadius: 'calc(infinity * 1px)',
      '--blog-gradient-position': 'to right in oklab',
      backgroundImage: 'linear-gradient(var(--blog-gradient-stops))',
      '--blog-gradient-from': 'var(--primary)',
      '--blog-gradient-stops':
        'var(--blog-gradient-via-stops, var(--blog-gradient-position), var(--blog-gradient-from) var(--blog-gradient-from-position), var(--blog-gradient-to) var(--blog-gradient-to-position))',
      '--blog-gradient-via': 'var(--primary-2)',
      '--blog-gradient-via-stops':
        'var(--blog-gradient-position), var(--blog-gradient-from) var(--blog-gradient-from-position), var(--blog-gradient-via) var(--blog-gradient-via-position), var(--blog-gradient-to) var(--blog-gradient-to-position)',
      '--blog-gradient-to': 'var(--primary-3)',
      paddingInline: 'calc(var(--spacing) * 3)',
      paddingBlock: 'var(--spacing)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      fontWeight: 'var(--font-weight-bold)',
      color: 'var(--color-white)',
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
      translate: 'var(--announcement-link-translate, none)',
    },
  },
  button: {
    '@layer utilities': {
      flexShrink: '0',
      alignSelf: 'flex-start',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--spacing)',
      color: {
        default: 'var(--surface)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--surface) 50%, transparent)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'var(--surface)',
        },
      },
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --blog-gradient-from, --blog-gradient-via, --blog-gradient-to',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
      backgroundColor: {
        default: null,
        '@media (hover: hover)': {
          default: null,
          ':hover': 'var(--surface)',
          '@supports (color: color-mix(in lab, red, red))': {
            default: null,
            ':hover': 'color-mix(in oklab, var(--surface) 10%, transparent)',
          },
        },
      },
    },
  },
})
export const div = stylex.props(sx.div).className!
export const div2 = stylex.props(sx.div2).className!
export const div3 = stylex.props(sx.div3).className!
export const div4 = stylex.props(sx.div4).className!
export const link = stylex.props(sx.link).className!
export const span = stylex.props(sx.span).className!
export const span2 = stylex.props(sx.span2).className!
export const span3 = stylex.props(sx.span3).className!
export const span4 = stylex.props(sx.span4).className!
export const span5 = stylex.props(sx.span5).className!
export const span6 = stylex.props(sx.span6).className!
export const span7 = stylex.props(sx.span7).className!
export const span8 = stylex.props(sx.span8).className!
export const span9 = stylex.props(sx.span9).className!
export const button = stylex.props(sx.button).className!
