import * as stylex from '@stylexjs/stylex'

const TRANSITION_ALL =
  'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, translate, scale, rotate, filter, -webkit-backdrop-filter, backdrop-filter'

const sx = stylex.create({
  size4: {
    '@layer utilities': {height: '1rem', width: '1rem'},
  },
  size5: {
    '@layer utilities': {height: '1.25rem', width: '1.25rem'},
  },
  size6: {
    '@layer utilities': {height: '1.5rem', width: '1.5rem'},
  },
  size8: {
    '@layer utilities': {height: '2rem', width: '2rem'},
  },
  size10: {
    '@layer utilities': {height: '2.5rem', width: '2.5rem'},
  },
  link: {
    '@layer utilities': {
      fontSize: '0.875rem',
      lineHeight: 'calc(1.25 / 0.875)',
      color: {
        default: 'oklch(55.2% 0.016 285.938)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'oklch(44.2% 0.017 285.786)',
        },
      },
      transitionProperty: TRANSITION_ALL,
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      transitionDuration: '150ms',
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
          ':hover': 'oklch(62.3% 0.214 259.815)',
          ':is(.dark *):hover': 'oklch(70.7% 0.165 254.624)',
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
  label: stylex.props(sx.label).className ?? '',
  icon: stylex.props(sx.icon).className ?? '',
}
