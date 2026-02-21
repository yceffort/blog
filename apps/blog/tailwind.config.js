import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'
import colors from 'tailwindcss/colors'
import defaultTheme from 'tailwindcss/defaultTheme'

export default {
  mode: 'jit',
  content: ['./src/**/*.ts*', '../../packages/shared/src/**/*.tsx'],
  safelist: [
    'fixed',
    'bottom-0',
    'opacity-100',
    'from-indigo-600',
    'via-purple-600',
    'to-pink-600',
    'translate-y-0',
    'bg-gradient-to-r',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: colors.indigo,
        secondary: colors.pink,
        accent: colors.teal,
        dark: '#09090b', // zinc-950
        light: '#ffffff',
        gray: colors.zinc,
        code: {
          green: '#a4f4c0',
          yellow: '#ffeb99',
          purple: '#d7a9ff',
          red: '#ff9999',
          blue: '#98dcff',
          white: '#ffffff',
        },
        'code-light': {
          green: '#16a34a',
          yellow: '#ca8a04',
          purple: '#9333ea',
          red: '#dc2626',
          blue: '#2563eb',
          black: '#1f2937',
        },
      },
      boxShadow: {
        brutal: '2px 2px 0px 0px #52525b', // zinc-600
        'brutal-lg': '4px 4px 0px 0px #52525b',
        'brutal-sm': '1px 1px 0px 0px #52525b',
        'brutal-dark': '2px 2px 0px 0px #a1a1aa', // zinc-400
        'brutal-lg-dark': '4px 4px 0px 0px #a1a1aa', // zinc-400
      },
      borderWidth: {
        3: '3px',
      },
      animation: {
        blink: 'blink 2s step-end infinite', // Changed from 1s to 2s
      },
      keyframes: {
        blink: {
          '0%, 100%': {opacity: '1'},
          '50%': {opacity: '0'},
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.gray.700'),
            a: {
              color: theme('colors.primary.500'),
              '&:hover': {
                color: theme('colors.primary.600'),
              },
              code: {color: theme('colors.primary.400')},
            },
            'h1,h2': {
              fontWeight: '700',
              letterSpacing: theme('letterSpacing.tight'),
            },
            h3: {
              fontWeight: '600',
            },
            code: {
              color: theme('colors.pink.500'),
            },
          },
        },
        dark: {
          css: {
            color: theme('colors.gray.300'),
            a: {
              color: theme('colors.primary.400'),
              '&:hover': {
                color: theme('colors.primary.300'),
              },
              code: {color: theme('colors.primary.400')},
            },
            'h1,h2,h3,h4,h5,h6': {
              color: theme('colors.gray.100'),
            },
            hr: {borderColor: theme('colors.gray.700')},
            'ol li:before': {
              fontWeight: '600',
              color: theme('colors.gray.400'),
            },
            'ul li:before': {
              backgroundColor: theme('colors.gray.400'),
            },
            strong: {color: theme('colors.gray.100')},
            thead: {
              th: {
                color: theme('colors.gray.100'),
              },
            },
            tbody: {
              tr: {
                borderBottomColor: theme('colors.gray.700'),
              },
            },
            blockquote: {
              color: theme('colors.gray.100'),
              borderLeftColor: theme('colors.gray.700'),
            },
          },
        },
      }),
    },
  },
  variants: {
    typography: ['dark'],
  },
  plugins: [forms, typography],
}
