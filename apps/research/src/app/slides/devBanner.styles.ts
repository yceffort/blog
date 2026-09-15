import * as stylex from '@stylexjs/stylex'

const sx = stylex.create({
  banner: {
    '@layer site': {
      pointerEvents: 'none',
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      zIndex: 50,
      userSelect: 'none',
      borderRadius: '0.5rem',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'oklch(82.8% 0.189 84.429)',
        ':is(.dark *)': 'oklch(76.9% 0.188 70.08)',
      },
      background: {
        default:
          'color-mix(in oklab, oklch(96.2% 0.059 95.617) 95%, transparent)',
        ':is(.dark *)':
          'color-mix(in oklab, oklch(41.4% 0.112 45.904) 90%, transparent)',
      },
      paddingInline: '1rem',
      paddingBlock: '0.5rem',
      fontSize: '0.875rem',
      lineHeight: 'calc(1.25 / 0.875)',
      fontWeight: '500',
      color: {
        default: 'oklch(41.4% 0.112 45.904)',
        ':is(.dark *)': 'oklch(96.2% 0.059 95.617)',
      },
      boxShadow:
        '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      backdropFilter: 'blur(8px)',
    },
  },
})

export const devBanner = stylex.props(sx.banner).className!
