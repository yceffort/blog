import * as stylex from '@stylexjs/stylex'
const sx = stylex.create({
  div: {
    '@layer utilities': {
      '--blog-translate-y': '0px',
      translate: 'var(--blog-translate-x) var(--blog-translate-y)',
      opacity: '100%',
    },
  },
  div2: {
    '@layer utilities': {
      '--blog-translate-y': 'calc(var(--spacing) * -1)',
      translate: 'var(--blog-translate-x) var(--blog-translate-y)',
      opacity: '0%',
    },
  },
  div3: {
    '@layer utilities': {
      position: 'absolute',
      top: '100%',
      right: '0px',
      zIndex: '40',
      marginTop: 'calc(var(--spacing) * 3)',
      width: 'max-content',
      transitionProperty: 'opacity,translate',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration: '300ms',
      '--blog-duration': '300ms',
    },
  },
  div4: {
    '@layer utilities': {
      position: 'absolute',
      top: 'calc(var(--spacing) * -1)',
      right: 'calc(var(--spacing) * 4)',
      height: 'calc(var(--spacing) * 2.5)',
      width: 'calc(var(--spacing) * 2.5)',
      rotate: '45deg',
      backgroundColor: {
        default: 'oklch(21% 0.006 285.885)',
        ':is(.dark *)': 'oklch(96.7% 0.001 286.375)',
      },
    },
  },
  div5: {
    '@layer utilities': {
      display: 'flex',
      alignItems: 'center',
      gap: 'calc(var(--spacing) * 2)',
      borderRadius: 'var(--radius-xl)',
      backgroundColor: {
        default: 'oklch(21% 0.006 285.885)',
        ':is(.dark *)': 'oklch(96.7% 0.001 286.375)',
      },
      paddingBlock: 'calc(var(--spacing) * 2.5)',
      paddingRight: 'calc(var(--spacing) * 2)',
      paddingLeft: 'calc(var(--spacing) * 4)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--blog-leading, var(--text-sm--line-height))',
      color: {
        default: 'var(--color-white)',
        ':is(.dark *)': 'oklch(21% 0.006 285.885)',
      },
      '--blog-shadow':
        '0 10px 15px -3px var(--blog-shadow-color, rgb(0 0 0 / 0.1)), 0 4px 6px -4px var(--blog-shadow-color, rgb(0 0 0 / 0.1))',
      boxShadow:
        'var(--blog-inset-shadow), var(--blog-inset-ring-shadow), var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
    },
  },
  button: {
    '@layer utilities': {
      fontWeight: 'var(--font-weight-medium)',
    },
  },
  button2: {
    '@layer utilities': {
      paddingInline: 'calc(var(--spacing) * 1.5)',
      fontSize: 'var(--text-base)',
      lineHeight: '1',
      '--blog-leading': '1',
      opacity: {
        default: '60%',
        '@media (hover: hover)': {
          default: null,
          ':hover': '100%',
        },
      },
    },
  },
})
export const div = stylex.props(sx.div).className!
export const div2 = stylex.props(sx.div2).className!
export const div3 = stylex.props(sx.div3).className!
export const div4 = stylex.props(sx.div4).className!
export const div5 = stylex.props(sx.div5).className!
export const button = stylex.props(sx.button).className!
export const button2 = stylex.props(sx.button2).className!
