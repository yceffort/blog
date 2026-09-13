import * as stylex from '@stylexjs/stylex'
const sx = stylex.create({
  button: {
    '@layer utilities': {
      display: 'block',
      width: '100%',
      cursor: 'zoom-in',
    },
  },
  div: {
    '@layer utilities': {
      position: 'fixed',
      inset: '0px',
      zIndex: '9999',
    },
  },
  div2: {
    '@layer utilities': {
      opacity: '90%',
    },
  },
  div3: {
    '@layer utilities': {
      opacity: '0%',
    },
  },
  div4: {
    '@layer utilities': {
      position: 'absolute',
      inset: '0px',
      backgroundColor: 'var(--color-black)',
      transitionProperty: 'opacity',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration: '300ms',
      '--blog-duration': '300ms',
    },
  },
  div5: {
    '@layer utilities': {
      position: 'absolute',
      transitionProperty: 'transform, translate, scale, rotate',
      transitionTimingFunction: 'var(--ease-out)',
      transitionDuration: '300ms',
      '--blog-duration': '300ms',
      '--blog-ease': 'var(--ease-out)',
    },
  },
  div6: {
    '@layer utilities': {
      cursor: 'zoom-out',
    },
  },
  button2: {
    '@layer utilities': {
      opacity: '100%',
    },
  },
  button3: {
    '@layer utilities': {
      position: 'absolute',
      top: 'calc(var(--spacing) * 4)',
      right: 'calc(var(--spacing) * 4)',
      borderRadius: 'calc(infinity * 1px)',
      backgroundColor: {
        default: 'color-mix(in srgb, #fff 10%, transparent)',
        '@supports (color: color-mix(in lab, red, red))':
          'color-mix(in oklab, var(--color-white) 10%, transparent)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'color-mix(in srgb, #fff 20%, transparent)',
          '@supports (color: color-mix(in lab, red, red))': {
            default: null,
            ':hover':
              'color-mix(in oklab, var(--color-white) 20%, transparent)',
          },
        },
      },
      padding: 'calc(var(--spacing) * 2)',
      color: 'var(--color-white)',
      '--blog-backdrop-blur': 'blur(var(--blur-sm))',
      WebkitBackdropFilter:
        'var(--blog-backdrop-blur,) var(--blog-backdrop-brightness,) var(--blog-backdrop-contrast,) var(--blog-backdrop-grayscale,) var(--blog-backdrop-hue-rotate,) var(--blog-backdrop-invert,) var(--blog-backdrop-opacity,) var(--blog-backdrop-saturate,) var(--blog-backdrop-sepia,)',
      backdropFilter:
        'var(--blog-backdrop-blur,) var(--blog-backdrop-brightness,) var(--blog-backdrop-contrast,) var(--blog-backdrop-grayscale,) var(--blog-backdrop-hue-rotate,) var(--blog-backdrop-invert,) var(--blog-backdrop-opacity,) var(--blog-backdrop-saturate,) var(--blog-backdrop-sepia,)',
      transitionProperty: 'opacity',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration: '300ms',
      '--blog-duration': '300ms',
    },
  },
  svg: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 6)',
      width: 'calc(var(--spacing) * 6)',
    },
  },
})
export const button = stylex.props(sx.button).className!
export const div = stylex.props(sx.div).className!
export const div2 = stylex.props(sx.div2).className!
export const div3 = stylex.props(sx.div3).className!
export const div4 = stylex.props(sx.div4).className!
export const div5 = stylex.props(sx.div5).className!
export const div6 = stylex.props(sx.div6).className!
export const button2 = stylex.props(sx.button2).className!
export const button3 = stylex.props(sx.button3).className!
export const svg = stylex.props(sx.svg).className!
