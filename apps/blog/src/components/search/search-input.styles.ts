import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  element_input: {
    '@layer base': {
      '--blog-shadow': '0 0 #0000',
      padding: '0.5rem 0.75rem',
      borderTopWidth: '1px',
      borderRightWidth: '1px',
      borderBottomWidth: '1px',
      borderLeftWidth: '1px',
      borderTopColor: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':focus': 'oklch(54.6% 0.245 262.881)',
      },
      borderRightColor: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':focus': 'oklch(54.6% 0.245 262.881)',
      },
      borderBottomColor: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':focus': 'oklch(54.6% 0.245 262.881)',
      },
      borderLeftColor: {
        default: 'oklch(55.2% 0.016 285.938)',
        ':focus': 'oklch(54.6% 0.245 262.881)',
      },
      borderRadius: '0',
      backgroundColor: '#fff',
      fontSize: '1rem',
      lineHeight: '1.5rem',
      appearance: 'none',
      '--blog-ring-inset': {
        default: null,
        ':focus': 'var(--blog-empty, )',
      },
      '--blog-ring-offset-width': {
        default: null,
        ':focus': '0',
      },
      '--blog-ring-offset-color': {
        default: null,
        ':focus': '#fff',
      },
      '--blog-ring-color': {
        default: null,
        ':focus': 'oklch(54.6% 0.245 262.881)',
      },
      '--blog-ring-offset-shadow': {
        default: null,
        ':focus':
          'var(--blog-ring-inset) 0 0 0 var(--blog-ring-offset-width) var(--blog-ring-offset-color)',
      },
      '--blog-ring-shadow': {
        default: null,
        ':focus':
          'var(--blog-ring-inset) 0 0 0 calc(1px + var(--blog-ring-offset-width)) var(--blog-ring-color)',
      },
      outline: {
        default: null,
        ':focus': '2px solid transparent',
      },
      outlineOffset: {
        default: null,
        ':focus': '2px',
      },
      boxShadow: {
        default: null,
        ':focus':
          'var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
      },
    },
    color: {
      default: null,
      '::placeholder': {
        default: null,
        '@layer base': 'oklch(55.2% 0.016 285.938)',
      },
    },
    opacity: {
      default: null,
      '::placeholder': {
        default: null,
        '@layer base': '1',
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const element_input = stylex.props(styles.element_input).className!
