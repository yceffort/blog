import * as stylex from '@stylexjs/stylex'
const styles = stylex.create({
  about_hero: {
    '@layer site': {
      display: 'grid',
      alignItems: 'center',
      padding: '24px 0 32px',
      gridTemplateColumns: {
        default: '1fr',
        '@media (min-width: 900px)': '1.3fr 1fr',
      },
      gap: '24px',
    },
  },
  about_socials: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      marginTop: '20px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '13px',
      color: 'var(--ink-2)',
    },
  },
  about_social_link: {
    '@layer site': {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '8px 14px',
      borderTopWidth: '1px',
      borderTopStyle: 'solid',
      borderTopColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRightWidth: '1px',
      borderRightStyle: 'solid',
      borderRightColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderLeftWidth: '1px',
      borderLeftStyle: 'solid',
      borderLeftColor: {
        default: 'var(--border)',
        ':hover': 'var(--primary)',
      },
      borderRadius: '8px',
      gap: '8px',
      color: {
        default: null,
        ':hover': 'var(--primary)',
      },
      backgroundColor: 'var(--surface)',
      backgroundImage: 'none',
      backgroundPosition: 'initial',
      backgroundSize: 'auto',
      backgroundRepeat: 'repeat',
      backgroundOrigin: 'padding-box',
      backgroundClip: 'border-box',
      backgroundAttachment: 'scroll',
      transition: 'all 200ms',
    },
  },
  about_tab_link: {
    '@layer site': {
      padding: '12px 24px',
      color: {
        default: 'var(--ink-3)',
        ':is([data-active="true"])': 'var(--ink)',
      },
      flex: '1',
      fontSize: '14px',
      fontWeight: '600',
      letterSpacing: '-0.01em',
      textAlign: 'center',
      textDecoration: 'none',
    },
    backgroundColor: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'var(--primary)',
      },
    },
    backgroundImage: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'none',
      },
    },
    backgroundPosition: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'initial',
      },
    },
    backgroundSize: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'auto',
      },
    },
    backgroundRepeat: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'repeat',
      },
    },
    backgroundOrigin: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'padding-box',
      },
    },
    backgroundClip: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'border-box',
      },
    },
    backgroundAttachment: {
      default: null,
      '::after': {
        default: null,
        '@layer site': 'scroll',
      },
    },
    transition: {
      default: null,
      '@layer site': 'color 180ms',
      '::after': {
        default: null,
        '@layer site': 'transform 240ms cubic-bezier(0.2, 0.9, 0.2, 1)',
      },
    },
    position: {
      default: null,
      '@layer site': 'relative',
      '::after': {
        default: null,
        '@layer site': 'absolute',
      },
    },
    content: {
      default: null,
      '::after': {
        default: null,
        '@layer site': "''",
      },
    },
    right: {
      default: null,
      '::after': {
        default: null,
        '@layer site': '0',
      },
    },
    bottom: {
      default: null,
      '::after': {
        default: null,
        '@layer site': '-1px',
      },
    },
    left: {
      default: null,
      '::after': {
        default: null,
        '@layer site': '0',
      },
    },
    height: {
      default: null,
      '::after': {
        default: null,
        '@layer site': '2px',
      },
    },
    transform: {
      default: null,
      '::after': {
        default: null,
        '@layer site': {
          default: 'scaleX(0)',
          ':is([data-active="true"])': 'scaleX(1)',
        },
      },
    },
  },
  tabs: {
    '@layer site': {
      position: 'relative',
      display: 'flex',
      margin: '32px 0 24px',
      borderBottomWidth: '1px',
      borderBottomStyle: 'solid',
      borderBottomColor: 'var(--border)',
      gap: '0',
    },
  },
  page_title_fx: {
    '@layer site': {
      position: 'relative',
      width: '100%',
      height: 'clamp(140px, 22vw, 240px)',
      margin: '4px 0 8px',
    },
  },
  element_canvas: {
    '@layer site': {
      display: {
        default: 'block',
        '@media (prefers-reduced-motion: reduce)': 'none',
      },
      borderRadius: '50%',
      cursor: 'crosshair',
    },
  },
  hero_fx_canvas: {
    '@layer site': {
      position: 'relative',
      width: '100%',
      height: '100%',
      touchAction: 'pan-y',
    },
  },
  hero_fx_hint: {
    '@layer site': {
      position: 'absolute',
      right: '8px',
      bottom: '4px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
      opacity: '0.65',
      pointerEvents: 'none',
    },
  },
  hero_fx_hint_touch: {
    '@layer site': {
      display: {
        default: 'none',
        '@media (hover: none) and (pointer: coarse)': 'block',
      },
    },
  },
  hero_fx_hint_desktop: {
    '@layer site': {
      display: {
        default: null,
        '@media (hover: none) and (pointer: coarse)': 'none',
      },
    },
  },
  hero_fx_b: {
    '@layer site': {
      width: '320px',
      height: '320px',
    },
  },
})

// Resolve locally so the compiler can erase style composition.
export const about_hero = stylex.props(styles.about_hero).className!
export const about_socials = stylex.props(styles.about_socials).className!
export const about_social_link = stylex.props(
  styles.about_social_link,
).className!
export const about_tab_link = stylex.props(styles.about_tab_link).className!
export const tabs = stylex.props(styles.tabs).className!
export const page_title_fx = stylex.props(styles.page_title_fx).className!
export const element_canvas = stylex.props(styles.element_canvas).className!
export const hero_fx_canvas = stylex.props(styles.hero_fx_canvas).className!
export const hero_fx_hint = stylex.props(styles.hero_fx_hint).className!
export const hero_fx_hint_touch = stylex.props(
  styles.hero_fx_hint_touch,
).className!
export const hero_fx_hint_desktop = stylex.props(
  styles.hero_fx_hint_desktop,
).className!
// hero_fx_canvas(100%)와 hero_fx_b(320px)는 같은 속성을 정의하므로 여기서 합성한다.
// 클래스 문자열로 이어 붙이면 승자가 CSS 파일 순서에 달린다.
export const hero_fx_b_canvas = stylex.props(
  styles.hero_fx_canvas,
  styles.hero_fx_b,
).className!
