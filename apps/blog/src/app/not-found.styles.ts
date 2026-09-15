import * as stylex from '@stylexjs/stylex'
const sx = stylex.create({
  div: {
    '@layer utilities': {
      display: 'flex',
      flexDirection: {
        default: 'column',
        '@media (width >= 48rem)': 'row',
      },
      alignItems: {
        default: 'flex-start',
        '@media (width >= 48rem)': 'center',
      },
      justifyContent: {
        default: 'flex-start',
        '@media (width >= 48rem)': 'center',
      },
      marginTop: {
        default: null,
        '@media (width >= 48rem)': 'calc(var(--spacing) * 24)',
      },
    },
  },
  div2: {
    '@layer utilities': {
      paddingTop: 'calc(var(--spacing) * 6)',
      paddingBottom: 'calc(var(--spacing) * 8)',
    },
  },
  h1: {
    '@layer utilities': {
      fontSize: {
        default: 'var(--text-6xl)',
        '@media (width >= 48rem)': 'var(--text-8xl)',
      },
      lineHeight: {
        default: 'calc(var(--spacing) * 9)',
        '@media (width >= 48rem)': 'calc(var(--spacing) * 14)',
      },
      '--blog-leading': {
        default: 'calc(var(--spacing) * 9)',
        '@media (width >= 48rem)': 'calc(var(--spacing) * 14)',
      },
      fontWeight: 'var(--font-weight-extrabold)',
      letterSpacing: 'var(--tracking-tight)',
      color: {
        default: 'oklch(21% 0.006 285.885)',
        ':is(.dark *)': 'oklch(96.7% 0.001 286.375)',
      },
      borderRightStyle: {
        default: null,
        '@media (width >= 48rem)': 'var(--blog-border-style)',
      },
      borderRightWidth: {
        default: null,
        '@media (width >= 48rem)': '2px',
      },
      paddingInline: {
        default: null,
        '@media (width >= 48rem)': 'calc(var(--spacing) * 6)',
      },
    },
  },
  div3: {
    '@layer utilities': {
      maxWidth: 'var(--container-md)',
    },
  },
  p: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 4)',
      fontSize: {
        default: 'var(--text-xl)',
        '@media (width >= 48rem)': 'var(--text-2xl)',
      },
      lineHeight: {
        default: 'var(--leading-normal)',
        '@media (width >= 48rem)':
          'var(--blog-leading, var(--text-2xl--line-height))',
      },
      '--blog-leading': 'var(--leading-normal)',
      fontWeight: 'var(--font-weight-bold)',
    },
  },
  p2: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 8)',
    },
  },
  button: {
    '@layer utilities': {
      display: 'inline',
      borderRadius: 'var(--radius-lg)',
      borderStyle: 'var(--blog-border-style)',
      borderWidth: '1px',
      borderColor: 'transparent',
      backgroundColor: {
        default: 'var(--color-blue-600)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'var(--color-blue-700)',
          ':is(.dark *):hover': 'var(--color-blue-500)',
        },
      },
      paddingInline: 'calc(var(--spacing) * 4)',
      paddingBlock: 'calc(var(--spacing) * 2)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'calc(var(--spacing) * 5)',
      '--blog-leading': 'calc(var(--spacing) * 5)',
      fontWeight: 'var(--font-weight-medium)',
      color: 'var(--color-white)',
      '--blog-shadow':
        '0 1px 3px 0 var(--blog-shadow-color, rgb(0 0 0 / 0.1)), 0 1px 2px -1px var(--blog-shadow-color, rgb(0 0 0 / 0.1))',
      boxShadow:
        'var(--blog-inset-shadow), var(--blog-inset-ring-shadow), var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --blog-gradient-from, --blog-gradient-via, --blog-gradient-to',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration: '150ms',
      '--blog-duration': '150ms',
      outlineStyle: {
        default: null,
        ':focus': 'none',
      },
      // 원래 붙어 있던 focus:shadow-outline-blue 는 Tailwind 설정에 없어 한 번도 생성된 적이
      // 없었다. 키보드 포커스 표시를 링 변수로 대신한다.
      '--blog-ring-shadow': {
        default: null,
        ':focus-visible':
          '0 0 0 3px color-mix(in oklab, var(--color-blue-500) 50%, transparent)',
      },
      outline: {
        default: null,
        ':focus': {
          default: null,
          '@media (forced-colors: active)': '2px solid transparent',
        },
      },
      outlineOffset: {
        default: null,
        ':focus': {
          default: null,
          '@media (forced-colors: active)': '2px',
        },
      },
    },
  },
})
export const div = stylex.props(sx.div).className!
export const div2 = stylex.props(sx.div2).className!
export const h1 = stylex.props(sx.h1).className!
export const div3 = stylex.props(sx.div3).className!
export const p = stylex.props(sx.p).className!
export const p2 = stylex.props(sx.p2).className!
export const button = stylex.props(sx.button).className!
