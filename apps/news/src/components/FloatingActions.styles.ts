import * as stylex from '@stylexjs/stylex'

// 공통 플로팅 목차(packages/shared FloatingToc)에 넘기는 news 스타일.
const sx = stylex.create({
  root: {
    '@layer site': {
      position: 'fixed',
      right: '24px',
      bottom: '24px',
      zIndex: '50',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  },
  panel: {
    '@layer site': {
      overflowY: 'auto',
      position: 'absolute',
      right: '0',
      bottom: '64px',
      width: '300px',
      maxHeight: '60vh',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border)',
      borderRadius: '12px',
      boxShadow: '0 20px 50px -20px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      transform: {
        default: 'translateY(16px) scale(0.9)',
        ':is([data-open="true"])': 'none',
      },
      transformOrigin: 'bottom right',
      transition:
        'transform 240ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: {
        default: '0',
        ':is([data-open="true"])': '1',
      },
      pointerEvents: {
        default: 'none',
        ':is([data-open="true"])': 'auto',
      },
    },
  },
  header: {
    '@layer site': {
      position: 'sticky',
      top: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      backgroundColor: 'var(--surface)',
    },
  },
  title: {
    '@layer site': {
      margin: '0',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      fontWeight: '600',
      lineHeight: '1.4',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
    },
  },
  close: {
    '@layer site': {
      display: 'grid',
      width: '24px',
      height: '24px',
      borderWidth: '0',
      borderRadius: '6px',
      backgroundColor: 'transparent',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
      },
      cursor: 'pointer',
      placeItems: 'center',
    },
  },
  list: {
    '@layer site': {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
      padding: '8px 16px 16px',
      fontSize: '13px',
      listStyle: 'none',
    },
  },
  item: {
    '@layer site': {
      display: 'block',
      width: '100%',
      padding: '6px 0 6px 12px',
      borderLeftWidth: '2px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'transparent',
        ':hover': 'var(--border-2)',
        ':is([data-active="true"])': 'var(--primary)',
      },
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
        ':is([data-active="true"])': 'var(--primary)',
      },
      textAlign: 'start',
      cursor: 'pointer',
      transition: 'all 180ms',
    },
  },
  section: {
    '@layer site': {
      marginTop: '8px',
      paddingLeft: '0',
      borderLeftWidth: '0',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.08em',
      color: 'var(--ink-4)',
    },
  },
  button: {
    '@layer site': {
      display: 'grid',
      width: '40px',
      height: '40px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '50%',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
      },
      transition:
        'border-color 160ms, color 160ms, transform 220ms, opacity 220ms',
      cursor: 'pointer',
      placeItems: 'center',
    },
  },
  // 공통 컴포넌트가 맨 위로 버튼의 표시 여부를 data-show로 알린다
  scrollTopHidden: {
    '@layer site': {
      pointerEvents: {default: null, ':is([data-show="false"])': 'none'},
      transform: {default: null, ':is([data-show="false"])': 'translateY(8px)'},
      opacity: {default: null, ':is([data-show="false"])': '0'},
    },
  },
  dial: {
    '@layer site': {
      display: 'grid',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '50%',
      boxShadow: '0 10px 30px -12px rgba(0, 0, 0, 0.35)',
      backgroundColor: 'var(--surface)',
      color: {
        default: 'var(--ink-3)',
        ':hover': 'var(--ink)',
      },
      transition:
        'border-color 160ms, color 160ms, transform 220ms, opacity 220ms',
      cursor: 'pointer',
      placeItems: 'center',
      position: 'relative',
      width: '48px',
      height: '48px',
      padding: '0',
    },
  },
  dialSvg: {
    '@layer site': {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      padding: '2px',
      boxSizing: 'border-box',
      transform: 'rotate(-90deg)',
    },
  },
  dialTrack: {
    '@layer site': {
      stroke: 'var(--border)',
    },
  },
  dialFill: {
    '@layer site': {
      stroke: 'var(--primary)',
      strokeDasharray: '100.53',
      strokeDashoffset:
        'calc(100.53px - (100.53px * var(--progress, 0) / 100))',
      transition: 'stroke-dashoffset 120ms linear',
    },
  },
  dialNum: {
    '@layer site': {
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '10.5px',
      fontWeight: '600',
      color: 'var(--ink-2)',
    },
  },
  toast: {
    '@layer site': {
      position: 'absolute',
      right: '0',
      bottom: '56px',
      padding: '6px 10px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'var(--border)',
      borderRadius: '8px',
      backgroundColor: 'var(--surface)',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      color: 'var(--ink-2)',
      transform: {
        default: 'translateY(6px)',
        ':is([data-show="true"])': 'none',
      },
      transition: 'opacity 160ms, transform 160ms',
      opacity: {
        default: '0',
        ':is([data-show="true"])': '1',
      },
      pointerEvents: 'none',
    },
  },
})

export const button = stylex.props(sx.button).className ?? ''

export const floatingTocClassNames = {
  root: stylex.props(sx.root).className ?? '',
  panel: stylex.props(sx.panel).className ?? '',
  header: stylex.props(sx.header).className ?? '',
  title: stylex.props(sx.title).className ?? '',
  close: stylex.props(sx.close).className ?? '',
  list: '',
  ul: stylex.props(sx.list).className ?? '',
  link: stylex.props(sx.item).className ?? '',
  linkByLevel: {2: stylex.props(sx.item, sx.section).className ?? ''},
  scrollTop: stylex.props(sx.button, sx.scrollTopHidden).className ?? '',
  dial: stylex.props(sx.dial).className ?? '',
  dialSvg: stylex.props(sx.dialSvg).className ?? '',
  dialTrack: stylex.props(sx.dialTrack).className ?? '',
  dialFill: stylex.props(sx.dialFill).className ?? '',
  dialNum: stylex.props(sx.dialNum).className ?? '',
  toast: stylex.props(sx.toast).className ?? '',
  share: button,
}
