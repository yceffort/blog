import * as stylex from '@stylexjs/stylex'

const overviewFadeIn = stylex.keyframes({
  from: {opacity: 0},
  to: {opacity: 1},
})

const ARROW_LEFT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z'/%3E%3C/svg%3E\")"
const ARROW_RIGHT =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z'/%3E%3C/svg%3E\")"
const ARROW_UP =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z'/%3E%3C/svg%3E\")"
const HOME_ICON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/%3E%3C/svg%3E\")"

export const styles = stylex.create({
  marpSlides: {
    '@layer site': {
      position: 'relative',
      width: '100%',
      // 16:9 슬라이드가 뷰포트 높이를 넘지 않도록 폭을 높이에 맞춰 제한한다.
      // 가로로 든 휴대폰(예: 844x390)에서 슬라이드가 잘리고 스크롤이 생기던 문제를 없앤다.
      // 2px 는 슬라이드 프레임의 상하 테두리
      // dvh 는 주소창이 접히고 펴질 때마다 바뀌어 슬라이드 폭이 흔들리므로,
      // 주소창이 펼쳐진 최소 높이(svh)로 고정한다
      maxWidth: 'min(100%, calc((100svh - 2px) * 16 / 9 + 2px))',
      margin: '0 auto',
    },
  },
  multiple: {
    '@layer site': {
      cursor: 'pointer',
    },
  },
  laserMode: {
    '@layer site': {
      cursor: 'none',
    },
  },
  marpSlide: {
    '@layer site': {
      cursor: 'inherit',
      position: 'relative',
      width: '100%',
      height: '100%',
    },
  },
  clickArea: {
    '@layer site': {
      position: 'absolute',
      zIndex: 10,
      background: {
        default: 'transparent',
        ':hover': 'rgba(128, 128, 128, 0.3)',
      },
      transition: 'background 0.3s',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '::after': {
        content: '""',
        width: '32px',
        height: '32px',
        opacity: {default: 0, ':hover': 1},
        transition: 'opacity 0.3s',
        filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 1))',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      },
    },
  },
  clickAreaLeft: {
    '@layer site': {
      left: 0,
      top: '10%',
      width: '10%',
      height: '80%',
      '::after': {backgroundImage: ARROW_LEFT},
    },
  },
  clickAreaRight: {
    '@layer site': {
      right: 0,
      top: '10%',
      width: '10%',
      height: '80%',
      '::after': {backgroundImage: ARROW_RIGHT},
    },
  },
  clickAreaTop: {
    '@layer site': {
      left: 0,
      top: 0,
      width: '100%',
      height: '10%',
      '::after': {backgroundImage: ARROW_UP},
    },
  },
  clickAreaBottom: {
    '@layer site': {
      left: 0,
      bottom: 0,
      width: '100%',
      height: '10%',
      '::after': {
        width: '28px',
        height: '28px',
        backgroundImage: HOME_ICON,
      },
    },
  },
  progressBar: {
    '@layer site': {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '3px',
      background: 'rgba(128, 128, 128, 0.3)',
      zIndex: 100,
    },
  },
  progressBarFill: {
    '@layer site': {
      height: '100%',
      background: {
        default: 'linear-gradient(90deg, #10b981, #34d399)',
        '@media (prefers-color-scheme: dark)':
          'linear-gradient(90deg, #10b981, #6ee7b7)',
      },
      transition: 'width 0.3s ease-out',
    },
  },
  pageIndicator: {
    '@layer site': {
      position: 'absolute',
      bottom: '12%',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.5)',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '14px',
      pointerEvents: 'none',
      zIndex: 10,
      opacity: 0,
      transition: 'opacity 0.3s ease-in-out',
    },
  },
  visible: {
    '@layer site': {
      opacity: 1,
    },
  },
  errorMessage: {
    '@layer site': {
      padding: '20px',
      textAlign: 'center',
      color: '#666',
    },
  },
  contextMenu: {
    '@layer site': {
      position: 'fixed',
      zIndex: 1000,
      minWidth: '220px',
      maxHeight: 'calc(100dvh - 16px)',
      overflowY: 'auto',
      background: 'rgba(30, 30, 30, 0.95)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      padding: '6px 0',
      color: 'white',
      fontSize: '13px',
    },
  },
  contextMenuHeader: {
    '@layer site': {
      padding: '8px 12px',
      fontWeight: '600',
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
  },
  contextMenuDivider: {
    '@layer site': {
      height: '1px',
      background: 'rgba(255, 255, 255, 0.1)',
      margin: '4px 0',
    },
  },
  contextMenuItem: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: '8px 12px',
      background: {
        default: 'transparent',
        ':hover:not(:disabled)': 'rgba(255, 255, 255, 0.1)',
      },
      border: 'none',
      color: {
        default: 'white',
        ':disabled': 'rgba(255, 255, 255, 0.3)',
      },
      cursor: {default: 'pointer', ':disabled': 'not-allowed'},
      textAlign: 'left',
      fontSize: '13px',
      transition: 'background 0.15s',
    },
  },
  contextMenuIcon: {
    '@layer site': {
      width: '20px',
      marginRight: '8px',
      textAlign: 'center',
      fontSize: '14px',
    },
  },
  contextMenuShortcut: {
    '@layer site': {
      marginLeft: 'auto',
      paddingLeft: '16px',
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '11px',
      fontFamily: 'monospace',
    },
  },
  contextMenuGoTo: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      fontSize: '13px',
    },
  },
  contextMenuGoToInput: {
    '@layer site': {
      width: '60px',
      padding: '4px 8px',
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderColor: {
        default: 'rgba(255, 255, 255, 0.2)',
        ':focus': 'rgba(255, 255, 255, 0.4)',
      },
      borderRadius: '4px',
      color: 'white',
      fontSize: '12px',
      textAlign: 'center',
      outline: {default: null, ':focus': 'none'},
      '::placeholder': {color: 'rgba(255, 255, 255, 0.3)'},
    },
  },
  contextMenuGoToButton: {
    '@layer site': {
      padding: '4px 10px',
      background: {
        default: 'rgba(255, 255, 255, 0.15)',
        ':hover': 'rgba(255, 255, 255, 0.25)',
      },
      border: 'none',
      borderRadius: '4px',
      color: 'white',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'background 0.15s',
    },
  },

  // 슬라이드 오버뷰
  overview: {
    '@layer site': {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      overflow: 'auto',
      animationName: overviewFadeIn,
      animationDuration: '0.2s',
      animationTimingFunction: 'ease-out',
    },
  },
  overviewGrid: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: {
        default: 'repeat(auto-fill, minmax(200px, 1fr))',
        '@media (min-width: 768px)': 'repeat(auto-fill, minmax(240px, 1fr))',
        '@media (min-width: 1200px)': 'repeat(auto-fill, minmax(280px, 1fr))',
      },
      gap: '20px',
      maxWidth: '1400px',
      width: '100%',
      maxHeight: 'calc(100vh - 120px)',
      overflow: 'auto',
      padding: '20px',
    },
  },
  overviewItem: {
    '@layer site': {
      position: 'relative',
      background: 'rgba(255, 255, 255, 0.05)',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: {
        default: 'transparent',
        ':hover': 'rgba(255, 255, 255, 0.3)',
      },
      borderRadius: '8px',
      padding: '8px',
      cursor: 'pointer',
      transform: {default: null, ':hover': 'scale(1.05)'},
      boxShadow: {default: null, ':hover': '0 8px 24px rgba(0, 0, 0, 0.4)'},
      transition: 'transform 0.2s, border-color 0.2s, box-shadow 0.2s',
      aspectRatio: '16 / 9',
      overflow: 'hidden',
    },
  },
  overviewItemActive: {
    '@layer site': {
      borderColor: '#10b981',
      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
      '--overview-number-bg': '#10b981',
    },
  },
  overviewThumbnail: {
    '@layer site': {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      borderRadius: '4px',
      pointerEvents: 'none',
    },
  },
  overviewThumbnailInner: {
    '@layer site': {
      transformOrigin: 'top left',
      transform: 'scale(0.2)',
      width: '500%',
      height: '500%',
    },
  },
  overviewNumber: {
    '@layer site': {
      position: 'absolute',
      bottom: '12px',
      right: '12px',
      background: 'var(--overview-number-bg, rgba(0, 0, 0, 0.7))',
      color: 'white',
      padding: '4px 10px',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: '600',
      minWidth: '32px',
      textAlign: 'center',
    },
  },
  overviewHint: {
    '@layer site': {
      marginTop: '24px',
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: '13px',
    },
  },

  // 단축키 도움말
  helpOverlay: {
    '@layer site': {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(6px)',
      zIndex: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      animationName: overviewFadeIn,
      animationDuration: '0.15s',
      animationTimingFunction: 'ease-out',
    },
  },
  helpDialog: {
    '@layer site': {
      width: '100%',
      maxWidth: '560px',
      maxHeight: 'calc(100vh - 48px)',
      background: 'rgba(24, 24, 28, 0.98)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },
  },
  helpHeader: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    },
  },
  helpTitle: {
    '@layer site': {
      margin: 0,
      fontSize: '16px',
      fontWeight: '600',
    },
  },
  helpClose: {
    '@layer site': {
      background: 'transparent',
      border: 'none',
      color: {
        default: 'rgba(255, 255, 255, 0.6)',
        ':hover': 'white',
      },
      fontSize: '24px',
      lineHeight: '1',
      cursor: 'pointer',
      padding: '0 4px',
    },
  },
  helpContent: {
    '@layer site': {
      padding: '8px 20px 16px',
      overflow: 'auto',
    },
  },
  helpGroup: {
    '@layer site': {
      marginTop: '12px',
    },
  },
  helpGroupTitle: {
    '@layer site': {
      margin: '0 0 8px',
      fontSize: '11px',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      color: 'rgba(255, 255, 255, 0.5)',
    },
  },
  helpList: {
    '@layer site': {
      listStyle: 'none',
      margin: 0,
      padding: 0,
    },
  },
  helpItem: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '6px 0',
      fontSize: '13px',
    },
  },
  helpDesc: {
    '@layer site': {
      color: 'rgba(255, 255, 255, 0.85)',
    },
  },
  helpKeys: {
    '@layer site': {
      display: 'inline-flex',
      gap: '4px',
    },
  },
  helpKbd: {
    '@layer site': {
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderBottomWidth: '2px',
      borderRadius: '4px',
      padding: '2px 6px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.9)',
      minWidth: '20px',
      textAlign: 'center',
    },
  },
  helpHint: {
    '@layer site': {
      padding: '10px 20px',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.4)',
      textAlign: 'center',
    },
  },

  // QR 코드
  qrOverlay: {
    '@layer site': {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      zIndex: 600,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      animationName: overviewFadeIn,
      animationDuration: '0.15s',
      animationTimingFunction: 'ease-out',
    },
  },
  qrDialog: {
    '@layer site': {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      maxWidth: '320px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    },
  },
  qrCode: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  qrUrl: {
    '@layer site': {
      width: '100%',
      background: {default: '#f5f5f5', ':hover': '#ececec'},
      border: '1px solid #e5e5e5',
      borderRadius: '6px',
      padding: '8px 10px',
      fontSize: '12px',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      color: '#333',
      wordBreak: 'break-all',
      textAlign: 'left',
      cursor: 'pointer',
      transition: 'background 0.15s',
    },
  },
  qrHint: {
    '@layer site': {
      fontSize: '11px',
      color: '#888',
      textAlign: 'center',
    },
  },

  // 드로잉 모드
  drawingCanvas: {
    '@layer site': {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      zIndex: 50,
      cursor: 'crosshair',
      touchAction: 'none',
    },
  },
  drawTextInput: {
    '@layer site': {
      position: 'absolute',
      zIndex: 55,
      minWidth: '160px',
      padding: 0,
      background: 'transparent',
      border: '1px dashed currentColor',
      borderRadius: '2px',
      outline: 'none',
      fontSize: '24px',
      fontFamily: 'sans-serif',
      lineHeight: '1.2',
      boxShadow: {default: null, ':focus': 'none'},
    },
  },
  drawToolbar: {
    '@layer site': {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 60,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 14px',
      background: 'rgba(24, 24, 28, 0.95)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '12px',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
      userSelect: 'none',
    },
  },
  drawToolGroup: {
    '@layer site': {
      display: 'flex',
      gap: '4px',
      paddingRight: '12px',
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    },
  },
  drawToolGroupLast: {
    '@layer site': {
      borderRight: 'none',
    },
  },
  drawToolBtn: {
    '@layer site': {
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: {
        default: 'transparent',
        ':hover': 'rgba(255, 255, 255, 0.08)',
      },
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderRadius: '6px',
      color: {
        default: 'rgba(255, 255, 255, 0.7)',
        ':hover': 'white',
      },
      fontSize: '16px',
      cursor: 'pointer',
      transition: 'background 0.12s, border-color 0.12s, color 0.12s',
    },
  },
  drawToolBtnOn: {
    '@layer site': {
      background: 'rgba(255, 255, 255, 0.15)',
      borderColor: 'rgba(255, 255, 255, 0.25)',
      color: 'white',
    },
  },
  drawColorBtn: {
    '@layer site': {
      width: '24px',
      height: '24px',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderRadius: '50%',
      cursor: 'pointer',
      padding: 0,
      boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.2) inset',
      transform: {default: null, ':hover': 'scale(1.1)'},
      transition: 'transform 0.12s',
    },
  },
  drawColorBtnOn: {
    '@layer site': {
      borderColor: 'white',
      transform: 'scale(1.15)',
    },
  },
  drawClearBtn: {
    '@layer site': {
      background: {
        default: 'transparent',
        ':hover': 'rgba(255, 255, 255, 0.1)',
      },
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '6px',
      color: {
        default: 'rgba(255, 255, 255, 0.7)',
        ':hover': 'white',
      },
      cursor: 'pointer',
      padding: '6px 10px',
      fontSize: '12px',
      transition: 'background 0.12s, color 0.12s',
    },
  },
  drawCloseBtn: {
    '@layer site': {
      width: '32px',
      height: '32px',
      fontSize: '18px',
      padding: 0,
    },
  },

  // 레이저 포인터
  laserDot: {
    '@layer site': {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      background:
        'radial-gradient(circle, rgba(255, 80, 80, 1) 0%, rgba(255, 0, 0, 0.85) 60%, rgba(255, 0, 0, 0) 100%)',
      boxShadow:
        '0 0 8px 2px rgba(255, 0, 0, 0.6), 0 0 24px 6px rgba(255, 60, 60, 0.45), 0 0 56px 14px rgba(255, 80, 80, 0.18)',
      pointerEvents: 'none',
      zIndex: 9999,
      willChange: 'transform',
    },
  },

  // 슬라이드 검색
  searchOverlay: {
    '@layer site': {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 600,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '80px 20px 20px',
      animationName: overviewFadeIn,
      animationDuration: '0.12s',
      animationTimingFunction: 'ease-out',
    },
  },
  searchDialog: {
    '@layer site': {
      width: '100%',
      maxWidth: '560px',
      background: 'rgba(24, 24, 28, 0.98)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      maxHeight: 'calc(100vh - 100px)',
    },
  },
  searchInput: {
    '@layer site': {
      background: 'transparent',
      border: 'none',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      color: 'white',
      fontSize: '16px',
      padding: '16px 20px',
      outline: 'none',
      '::placeholder': {color: 'rgba(255, 255, 255, 0.35)'},
    },
  },
  searchResults: {
    '@layer site': {
      overflowY: 'auto',
      maxHeight: '50vh',
      padding: '6px 0',
    },
  },
  searchResult: {
    '@layer site': {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 20px',
      background: {
        default: 'transparent',
        ':hover': 'rgba(255, 255, 255, 0.06)',
      },
      border: 'none',
      color: 'rgba(255, 255, 255, 0.85)',
      textAlign: 'left',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'background 0.12s',
    },
  },
  searchResultIndex: {
    '@layer site': {
      flexShrink: 0,
      minWidth: '24px',
      textAlign: 'right',
      color: 'rgba(255, 255, 255, 0.45)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '12px',
    },
  },
  searchResultSnippet: {
    '@layer site': {
      flex: 1,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  searchEmpty: {
    '@layer site': {
      padding: '20px',
      textAlign: 'center',
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: '13px',
    },
  },
  searchHint: {
    '@layer site': {
      padding: '10px 20px',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      fontSize: '11px',
      color: 'rgba(255, 255, 255, 0.4)',
      textAlign: 'center',
    },
  },

  // 인쇄(PDF): 화면에서는 감추고 marp.css 의 @media print 가 드러낸다
  printContainer: {
    '@layer site': {
      display: 'none',
    },
  },

  // Marp 슬라이드 프레임
  slideFrame: {
    '@layer site': {
      borderWidth: '1px',
      borderStyle: 'solid',
      boxShadow:
        '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
  },
})

export const marpSlide = stylex.props(styles.marpSlide).className!
export const clickAreaLeft = stylex.props(
  styles.clickArea,
  styles.clickAreaLeft,
).className!
export const clickAreaRight = stylex.props(
  styles.clickArea,
  styles.clickAreaRight,
).className!
export const clickAreaTop = stylex.props(
  styles.clickArea,
  styles.clickAreaTop,
).className!
export const clickAreaBottom = stylex.props(
  styles.clickArea,
  styles.clickAreaBottom,
).className!
export const progressBar = stylex.props(styles.progressBar).className!
export const progressBarFill = stylex.props(styles.progressBarFill).className!
export const errorMessage = stylex.props(styles.errorMessage).className!
export const contextMenu = stylex.props(styles.contextMenu).className!
export const contextMenuHeader = stylex.props(
  styles.contextMenuHeader,
).className!
export const contextMenuDivider = stylex.props(
  styles.contextMenuDivider,
).className!
export const contextMenuItem = stylex.props(styles.contextMenuItem).className!
export const contextMenuIcon = stylex.props(styles.contextMenuIcon).className!
export const contextMenuShortcut = stylex.props(
  styles.contextMenuShortcut,
).className!
export const contextMenuGoTo = stylex.props(styles.contextMenuGoTo).className!
export const contextMenuGoToInput = stylex.props(
  styles.contextMenuGoToInput,
).className!
export const contextMenuGoToButton = stylex.props(
  styles.contextMenuGoToButton,
).className!
export const overview = stylex.props(styles.overview).className!
export const overviewGrid = stylex.props(styles.overviewGrid).className!
export const overviewItem = stylex.props(styles.overviewItem).className!
export const overviewItemActive = stylex.props(
  styles.overviewItem,
  styles.overviewItemActive,
).className!
export const overviewThumbnail = stylex.props(
  styles.overviewThumbnail,
).className!
export const overviewThumbnailInner = stylex.props(
  styles.overviewThumbnailInner,
).className!
export const overviewNumber = stylex.props(styles.overviewNumber).className!
export const overviewHint = stylex.props(styles.overviewHint).className!
export const helpOverlay = stylex.props(styles.helpOverlay).className!
export const helpDialog = stylex.props(styles.helpDialog).className!
export const helpHeader = stylex.props(styles.helpHeader).className!
export const helpTitle = stylex.props(styles.helpTitle).className!
export const helpClose = stylex.props(styles.helpClose).className!
export const helpContent = stylex.props(styles.helpContent).className!
export const helpGroup = stylex.props(styles.helpGroup).className!
export const helpGroupTitle = stylex.props(styles.helpGroupTitle).className!
export const helpList = stylex.props(styles.helpList).className!
export const helpItem = stylex.props(styles.helpItem).className!
export const helpDesc = stylex.props(styles.helpDesc).className!
export const helpKeys = stylex.props(styles.helpKeys).className!
export const helpKbd = stylex.props(styles.helpKbd).className!
export const helpHint = stylex.props(styles.helpHint).className!
export const qrOverlay = stylex.props(styles.qrOverlay).className!
export const qrDialog = stylex.props(styles.qrDialog).className!
export const qrCode = stylex.props(styles.qrCode).className!
export const qrUrl = stylex.props(styles.qrUrl).className!
export const qrHint = stylex.props(styles.qrHint).className!
export const drawingCanvas = stylex.props(styles.drawingCanvas).className!
export const drawTextInput = stylex.props(styles.drawTextInput).className!
export const drawToolbar = stylex.props(styles.drawToolbar).className!
export const drawToolGroup = stylex.props(styles.drawToolGroup).className!
export const drawToolGroupLast = stylex.props(
  styles.drawToolGroup,
  styles.drawToolGroupLast,
).className!
export const drawToolBtn = stylex.props(styles.drawToolBtn).className!
export const drawToolBtnOn = stylex.props(
  styles.drawToolBtn,
  styles.drawToolBtnOn,
).className!
export const drawColorBtn = stylex.props(styles.drawColorBtn).className!
export const drawColorBtnOn = stylex.props(
  styles.drawColorBtn,
  styles.drawColorBtnOn,
).className!
export const drawClearBtn = stylex.props(styles.drawClearBtn).className!
export const drawCloseBtn = stylex.props(
  styles.drawClearBtn,
  styles.drawCloseBtn,
).className!
export const laserDot = stylex.props(styles.laserDot).className!
export const searchOverlay = stylex.props(styles.searchOverlay).className!
export const searchDialog = stylex.props(styles.searchDialog).className!
export const searchInput = stylex.props(styles.searchInput).className!
export const searchResults = stylex.props(styles.searchResults).className!
export const searchResult = stylex.props(styles.searchResult).className!
export const searchResultIndex = stylex.props(
  styles.searchResultIndex,
).className!
export const searchResultSnippet = stylex.props(
  styles.searchResultSnippet,
).className!
export const searchEmpty = stylex.props(styles.searchEmpty).className!
export const searchHint = stylex.props(styles.searchHint).className!
export const printContainer = stylex.props(styles.printContainer).className!
export const slideFrame = stylex.props(styles.slideFrame).className!
export const pageIndicator = stylex.props(styles.pageIndicator).className!
export const pageIndicatorVisible = stylex.props(
  styles.pageIndicator,
  styles.visible,
).className!
