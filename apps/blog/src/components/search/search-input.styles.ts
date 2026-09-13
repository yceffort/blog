import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  element_input: {
    '@layer base': {
      '--blog-shadow': {
        default: null,
        ":is(input:where([type='search']))": '0 0 #0000',
      },
      padding: {
        default: null,
        ":is(input:where([type='search']))": '0.5rem 0.75rem',
      },
      borderTopWidth: {
        default: null,
        ":is(input:where([type='search']))": '1px',
      },
      borderRightWidth: {
        default: null,
        ":is(input:where([type='search']))": '1px',
      },
      borderBottomWidth: {
        default: null,
        ":is(input:where([type='search']))": '1px',
      },
      borderLeftWidth: {
        default: null,
        ":is(input:where([type='search']))": '1px',
      },
      borderTopColor: {
        default: null,
        ":is(input:where([type='search']))": 'oklch(55.2% 0.016 285.938)',
        ":is(input:where([type='search']):focus)": 'oklch(54.6% 0.245 262.881)',
      },
      borderRightColor: {
        default: null,
        ":is(input:where([type='search']))": 'oklch(55.2% 0.016 285.938)',
        ":is(input:where([type='search']):focus)": 'oklch(54.6% 0.245 262.881)',
      },
      borderBottomColor: {
        default: null,
        ":is(input:where([type='search']))": 'oklch(55.2% 0.016 285.938)',
        ":is(input:where([type='search']):focus)": 'oklch(54.6% 0.245 262.881)',
      },
      borderLeftColor: {
        default: null,
        ":is(input:where([type='search']))": 'oklch(55.2% 0.016 285.938)',
        ":is(input:where([type='search']):focus)": 'oklch(54.6% 0.245 262.881)',
      },
      borderRadius: {
        default: null,
        ":is(input:where([type='search']))": '0',
      },
      backgroundColor: {
        default: null,
        ":is(input:where([type='search']))": '#fff',
      },
      fontSize: {
        default: null,
        ":is(input:where([type='search']))": '1rem',
      },
      lineHeight: {
        default: null,
        ":is(input:where([type='search']))": '1.5rem',
      },
      appearance: {
        default: null,
        ":is(input:where([type='search']))": 'none',
      },
      '--blog-ring-inset': {
        default: null,
        ":is(input:where([type='search']):focus)": 'var(--blog-empty, )',
      },
      '--blog-ring-offset-width': {
        default: null,
        ":is(input:where([type='search']):focus)": '0',
      },
      '--blog-ring-offset-color': {
        default: null,
        ":is(input:where([type='search']):focus)": '#fff',
      },
      '--blog-ring-color': {
        default: null,
        ":is(input:where([type='search']):focus)": 'oklch(54.6% 0.245 262.881)',
      },
      '--blog-ring-offset-shadow': {
        default: null,
        ":is(input:where([type='search']):focus)":
          'var(--blog-ring-inset) 0 0 0 var(--blog-ring-offset-width) var(--blog-ring-offset-color)',
      },
      '--blog-ring-shadow': {
        default: null,
        ":is(input:where([type='search']):focus)":
          'var(--blog-ring-inset) 0 0 0 calc(1px + var(--blog-ring-offset-width)) var(--blog-ring-color)',
      },
      outline: {
        default: null,
        ":is(input:where([type='search']):focus)": '2px solid transparent',
      },
      outlineOffset: {
        default: null,
        ":is(input:where([type='search']):focus)": '2px',
      },
      boxShadow: {
        default: null,
        ":is(input:where([type='search']):focus)":
          'var(--blog-ring-offset-shadow), var(--blog-ring-shadow), var(--blog-shadow)',
      },
    },
    color: {
      default: null,
      '::placeholder': {
        default: null,
        '@layer base': {
          default: null,
          ":is(input:where([type='search']))": 'oklch(55.2% 0.016 285.938)',
        },
      },
    },
    opacity: {
      default: null,
      '::placeholder': {
        default: null,
        '@layer base': {
          default: null,
          ":is(input:where([type='search']))": '1',
        },
      },
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const element_input = stylex.props(styles.element_input).className!
