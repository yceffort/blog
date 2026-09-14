import * as stylex from '@stylexjs/stylex'
const sx = stylex.create({
  button: {
    '@layer utilities': {
      position: 'absolute',
      top: 'calc(var(--spacing) * 2)',
      right: 'calc(var(--spacing) * 2)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: {
        default: 'oklch(87.1% 0.006 286.286)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'oklch(70.5% 0.015 286.067)',
          ':is(.dark *):hover': 'oklch(44.2% 0.017 285.786)',
        },
        ':is(.dark *)': 'oklch(37% 0.013 285.805)',
      },
      paddingInline: 'calc(var(--spacing) * 2)',
      paddingBlock: 'var(--spacing)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      color: {
        default: 'oklch(37% 0.013 285.805)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'oklch(21% 0.006 285.885)',
          ':is(.dark *):hover': 'var(--color-white)',
        },
        ':is(.dark *)': 'oklch(87.1% 0.006 286.286)',
      },
    },
  },
  span: {
    '@layer utilities': {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing)',
    },
  },
  svg: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 4)',
      width: 'calc(var(--spacing) * 4)',
    },
  },
  div: {
    '@layer utilities': {
      position: 'relative',
    },
  },
  div2: {
    '@layer utilities': {
      borderTopLeftRadius: 'var(--radius-lg)',
      borderTopRightRadius: 'var(--radius-lg)',
      backgroundColor: {
        default: 'oklch(92% 0.004 286.32)',
        ':is(.dark *)': 'oklch(37% 0.013 285.805)',
      },
      paddingInline: 'calc(var(--spacing) * 4)',
      paddingBlock: 'calc(var(--spacing) * 2)',
      fontFamily:
        'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--blog-leading, var(--text-sm--line-height))',
      color: {
        default: 'oklch(37% 0.013 285.805)',
        ':is(.dark *)': 'oklch(87.1% 0.006 286.286)',
      },
    },
  },
  pre: {
    '@layer utilities': {
      marginTop: '0px !important',
      borderTopLeftRadius: '0',
      borderTopRightRadius: '0',
    },
  },
})
export const button = stylex.props(sx.button).className!
export const span = stylex.props(sx.span).className!
export const svg = stylex.props(sx.svg).className!
export const div = stylex.props(sx.div).className!
export const div2 = stylex.props(sx.div2).className!
export const pre = stylex.props(sx.pre).className!
