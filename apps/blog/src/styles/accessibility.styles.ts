import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  visually_hidden: {
    '@layer site': {
      overflow: 'hidden',
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      borderTopWidth: '0',
      borderTopStyle: 'none',
      borderTopColor: 'currentColor',
      borderRightWidth: '0',
      borderRightStyle: 'none',
      borderRightColor: 'currentColor',
      borderBottomWidth: '0',
      borderBottomStyle: 'none',
      borderBottomColor: 'currentColor',
      borderLeftWidth: '0',
      borderLeftStyle: 'none',
      borderLeftColor: 'currentColor',
      whiteSpace: 'nowrap',
      clip: 'rect(0, 0, 0, 0)',
    },
  },
  skip_link: {
    '@layer site': {
      position: 'fixed',
      top: '12px',
      left: '12px',
      zIndex: '100',
      padding: '10px 16px',
      borderRadius: '8px',
      backgroundColor: 'var(--primary)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
      fontSize: '14px',
      fontWeight: '600',
      color: '#fff',
      transform: {
        default: 'translateY(-200%)',
        ':focus': 'translateY(0)',
      },
      transition: 'transform 180ms ease',
      outline: {
        default: null,
        ':focus': 'none',
      },
    },
  },
})

export const visuallyHidden = stylex.props(styles.visually_hidden).className!
export const skipLink = stylex.props(styles.skip_link).className!
