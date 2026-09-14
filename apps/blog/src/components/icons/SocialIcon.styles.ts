import * as stylex from '@stylexjs/stylex'

import {visuallyHidden} from '@/styles/accessibility.styles'
const sx = stylex.create({
  size4: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 4)',
      width: 'calc(var(--spacing) * 4)',
    },
  },
  size5: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 5)',
      width: 'calc(var(--spacing) * 5)',
    },
  },
  size6: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 6)',
      width: 'calc(var(--spacing) * 6)',
    },
  },
  size8: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 8)',
      width: 'calc(var(--spacing) * 8)',
    },
  },
  size10: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 10)',
      width: 'calc(var(--spacing) * 10)',
    },
  },
  link: {
    '@layer utilities': {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--blog-leading, var(--text-sm--line-height))',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'oklch(44.2% 0.017 285.786)',
        },
      },
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --blog-gradient-from, --blog-gradient-via, --blog-gradient-to, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter, display, content-visibility, overlay, pointer-events',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
    },
  },
  label: {
    '@layer utilities': {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clipPath: 'inset(50%)',
      whiteSpace: 'nowrap',
      borderWidth: '0',
    },
  },
  icon: {
    '@layer utilities': {
      fill: 'currentcolor',
      color: {
        default: 'oklch(37% 0.013 285.805)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'var(--color-blue-500)',
          ':is(.dark *):hover': 'var(--color-blue-400)',
        },
        ':is(.dark *)': 'oklch(92% 0.004 286.32)',
      },
    },
  },
})
export const socialIconClassNames = {
  size4: stylex.props(sx.size4).className ?? '',
  size5: stylex.props(sx.size5).className ?? '',
  size6: stylex.props(sx.size6).className ?? '',
  size8: stylex.props(sx.size8).className ?? '',
  size10: stylex.props(sx.size10).className ?? '',
  link: stylex.props(sx.link).className ?? '',
  label:
    'visually-hidden ' +
    visuallyHidden +
    ' ' +
    (stylex.props(sx.label).className ?? ''),
  icon: stylex.props(sx.icon).className ?? '',
}
