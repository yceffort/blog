import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  root: {
    '@layer utilities': {
      display: {
        default: null,
        '@media (width >= 40rem)': 'none',
      },
    },
  },
  toggle: {
    '@layer utilities': {
      display: 'flex',
      height: 'calc(var(--spacing) * 10)',
      width: 'calc(var(--spacing) * 10)',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 'var(--radius-lg)',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --blog-gradient-from, --blog-gradient-via, --blog-gradient-to',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
    },
  },
  toggleIcon: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 6)',
      width: 'calc(var(--spacing) * 6)',
    },
  },
  visible: {
    '@layer utilities': {
      opacity: '100%',
    },
  },
  hidden: {
    '@layer utilities': {
      pointerEvents: 'none',
      opacity: '0%',
    },
  },
  backdrop: {
    '@layer utilities': {
      position: 'fixed',
      inset: '0px',
      zIndex: '100',
      transitionProperty: 'opacity',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration: '300ms',
      '--blog-duration': '300ms',
    },
  },
  sheetVisible: {
    '@layer utilities': {
      '--blog-translate-y': '0px',
      translate: 'var(--blog-translate-x) var(--blog-translate-y)',
      opacity: '100%',
    },
  },
  sheetHidden: {
    '@layer utilities': {
      pointerEvents: 'none',
      '--blog-translate-y': '100%',
      translate: 'var(--blog-translate-x) var(--blog-translate-y)',
      opacity: '0%',
    },
  },
  sheet: {
    '@layer utilities': {
      position: 'fixed',
      insetInline: '0px',
      bottom: '0px',
      zIndex: '101',
      transitionProperty: 'translate,opacity',
      transitionTimingFunction: 'var(--ease-out)',
      transitionDuration: '300ms',
      '--blog-duration': '300ms',
      '--blog-ease': 'var(--ease-out)',
    },
  },
  dialog: {
    '@layer utilities': {
      display: 'block',
      width: '100%',
      borderTopLeftRadius: '28px',
      borderTopRightRadius: '28px',
      paddingInline: 'calc(var(--spacing) * 5)',
      paddingTop: 'calc(var(--spacing) * 3)',
      paddingBottom: 'calc(var(--spacing) * 7)',
    },
  },
  handleContainer: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 5)',
      display: 'flex',
      justifyContent: 'center',
    },
  },
  handle: {
    '@layer utilities': {
      height: '5px',
      width: 'calc(var(--spacing) * 11)',
      borderRadius: 'calc(infinity * 1px)',
    },
  },
  heading: {
    '@layer utilities': {
      marginBottom: 'calc(var(--spacing) * 3)',
      paddingInline: 'calc(var(--spacing) * 3)',
      fontSize: '10px',
      fontWeight: 'var(--font-weight-medium)',
      textTransform: 'uppercase',
    },
  },
  nav: {
    '@layer utilities': {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing)',
    },
  },
  link: {
    '@layer utilities': {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 'calc(var(--spacing) * 4)',
      borderRadius: 'var(--radius-2xl)',
      paddingInline: 'calc(var(--spacing) * 4)',
      paddingBlock: 'calc(var(--spacing) * 3.5)',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --blog-gradient-from, --blog-gradient-via, --blog-gradient-to',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
    },
  },
  index: {
    '@layer utilities': {
      fontSize: '11px',
      '--blog-numeric-spacing': 'tabular-nums',
      fontVariantNumeric:
        'var(--blog-ordinal,) var(--blog-slashed-zero,) var(--blog-numeric-figure,) var(--blog-numeric-spacing,) var(--blog-numeric-fraction,)',
    },
  },
  label: {
    '@layer utilities': {
      flex: '1',
      fontSize: '17px',
      fontWeight: 'var(--font-weight-semibold)',
    },
  },
  activeDot: {
    '@layer utilities': {
      height: 'calc(var(--spacing) * 1.5)',
      width: 'calc(var(--spacing) * 1.5)',
      borderRadius: 'calc(infinity * 1px)',
    },
  },
  close: {
    '@layer utilities': {
      marginTop: 'calc(var(--spacing) * 5)',
      width: '100%',
      borderRadius: 'var(--radius-2xl)',
      paddingBlock: 'calc(var(--spacing) * 3.5)',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--blog-leading, var(--text-sm--line-height))',
      fontWeight: 'var(--font-weight-medium)',
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --blog-gradient-from, --blog-gradient-via, --blog-gradient-to',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
    },
  },
})
export const mobileNavClassNames = {
  root: stylex.props(sx.root).className ?? '',
  toggle: stylex.props(sx.toggle).className ?? '',
  toggleIcon: stylex.props(sx.toggleIcon).className ?? '',
  visible: stylex.props(sx.visible).className ?? '',
  hidden: stylex.props(sx.hidden).className ?? '',
  backdrop: stylex.props(sx.backdrop).className ?? '',
  sheetVisible: stylex.props(sx.sheetVisible).className ?? '',
  sheetHidden: stylex.props(sx.sheetHidden).className ?? '',
  sheet: stylex.props(sx.sheet).className ?? '',
  dialog: stylex.props(sx.dialog).className ?? '',
  handleContainer: stylex.props(sx.handleContainer).className ?? '',
  handle: stylex.props(sx.handle).className ?? '',
  heading: stylex.props(sx.heading).className ?? '',
  nav: stylex.props(sx.nav).className ?? '',
  link: stylex.props(sx.link).className ?? '',
  index: stylex.props(sx.index).className ?? '',
  label: stylex.props(sx.label).className ?? '',
  activeDot: stylex.props(sx.activeDot).className ?? '',
  close: stylex.props(sx.close).className ?? '',
}
