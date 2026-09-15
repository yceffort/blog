import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({
  sec_head: {
    '@layer site': {
      display: 'flex',
      alignItems: 'flex-end',
      marginTop: '8px',
      padding: '28px 0 20px',
      gap: '20px',
      scrollMarginTop: '5rem',
    },
  },
  sec_count: {
    '@layer site': {
      display: 'block',
      marginBottom: '6px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--ink-3)',
    },
  },
  sec_title: {
    '@layer site': {
      fontSize: 'clamp(28px, 4vw, 48px)',
      fontWeight: '900',
      lineHeight: '1.05',
      letterSpacing: '-0.03em',
      color: 'var(--ink)',
    },
  },
  sec_title_em: {
    '@layer site': {
      fontFamily: 'var(--font-serif), serif',
      fontStyle: 'italic',
      fontWeight: '500',
      color: 'var(--ink-3)',
    },
  },
  sec_line: {
    '@layer site': {
      flex: 1,
      height: '1px',
      marginBottom: '18px',
      background:
        'linear-gradient(90deg, var(--border-2), color-mix(in oklab, var(--border) 30%, transparent))',
    },
  },
  sec_hint: {
    '@layer site': {
      marginBottom: '18px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '11px',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      color: 'var(--ink-4)',
    },
  },
  card: {
    '@layer site': {
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid var(--border)',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'color-mix(in oklab, var(--primary) 50%, var(--border))',
      },
      borderRadius: 'var(--radius)',
      background: 'var(--surface)',
      boxShadow: {
        default: null,
        ':hover':
          '0 10px 40px -20px color-mix(in oklab, var(--primary) 80%, transparent)',
      },
      transition: 'border-color 300ms, box-shadow 300ms',
      // 제목 색은 카드 hover 가 커스텀 속성으로 넘긴다
      '--post-card-title-color': {
        default: null,
        ':hover': 'var(--primary)',
      },
      '::after': {
        content: '""',
        position: 'absolute',
        borderRadius: 'inherit',
        background:
          'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--primary) 10%, transparent) 0%, transparent 45%)',
        transition: 'opacity 300ms',
        opacity: {default: 0, ':hover': 1},
        inset: 0,
        pointerEvents: 'none',
      },
    },
  },
  card_link: {
    '@layer site': {
      position: 'absolute',
      inset: 0,
      zIndex: 3,
    },
  },
  thumb: {
    '@layer site': {
      overflow: 'hidden',
      position: 'relative',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface-2)',
      aspectRatio: '16 / 9',
    },
  },
  body: {
    '@layer site': {
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      padding: '18px 20px 20px',
      gap: '10px',
    },
  },
  tag_row: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    },
  },
  card_title: {
    '@layer site': {
      overflow: 'hidden',
      display: '-webkit-box',
      marginTop: '2px',
      fontSize: '17px',
      fontWeight: '700',
      lineHeight: '1.35',
      letterSpacing: '-0.015em',
      color: 'var(--post-card-title-color, var(--ink))',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
    },
  },
  card_desc: {
    '@layer site': {
      overflow: 'hidden',
      display: '-webkit-box',
      fontSize: '13px',
      lineHeight: '1.55',
      color: 'var(--ink-3)',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
    },
  },
  meta: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      marginTop: 'auto',
      paddingTop: '10px',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '12px',
      color: 'var(--ink-4)',
      gap: '6px',
    },
  },
  meta_link: {
    '@layer site': {
      position: 'relative',
      zIndex: 10,
      textDecorationLine: 'underline',
      textUnderlineOffset: '2px',
    },
  },
  draft_badge: {
    '@layer site': {
      position: 'absolute',
      right: '0.5rem',
      top: '0.5rem',
      zIndex: 10,
      borderRadius: '0.375rem',
      background: 'oklch(76.9% 0.188 70.08)',
      paddingInline: '0.5rem',
      paddingBlock: '0.125rem',
      fontSize: '0.75rem',
      lineHeight: 'calc(1 / 0.75)',
      fontWeight: '700',
      textTransform: 'uppercase',
      color: '#fff',
      boxShadow:
        '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    },
  },
  tag_chip: {
    '@layer site': {
      padding: '3px 9px',
      border: '1px solid var(--border)',
      borderRadius: '999px',
      background: 'var(--surface-2)',
      fontSize: '11px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      color: 'var(--ink-2)',
    },
  },
  filter_row: {
    '@layer site': {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '0.5rem',
      paddingBottom: '0.5rem',
    },
  },
  filter_chip: {
    '@layer site': {
      padding: '5px 12px',
      border: '1px solid var(--border)',
      borderColor: {
        default: 'var(--border)',
        ':hover': 'color-mix(in oklab, var(--primary) 40%, var(--border))',
      },
      borderRadius: '999px',
      background: 'var(--surface)',
      fontSize: '12px',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      color: {
        default: 'var(--ink-2)',
        ':hover': 'var(--primary)',
      },
      cursor: 'pointer',
      transition:
        'border-color 180ms ease, background-color 180ms ease, color 180ms ease',
    },
  },
  filter_chip_on: {
    '@layer site': {
      borderColor: 'color-mix(in oklab, var(--primary) 50%, transparent)',
      background: 'color-mix(in oklab, var(--primary) 14%, var(--surface))',
      color: 'var(--primary)',
    },
  },
  filter_count: {
    '@layer site': {
      opacity: 0.55,
    },
  },
  grid: {
    '@layer site': {
      display: 'grid',
      gridTemplateColumns: {
        default: 'repeat(1, minmax(0, 1fr))',
        '@media (width >= 48rem)': 'repeat(2, minmax(0, 1fr))',
      },
      gap: '1.5rem',
      paddingTop: '1rem',
    },
  },
  empty: {
    '@layer site': {
      gridColumn: '1 / -1',
      paddingBlock: '4rem',
      textAlign: 'center',
      fontSize: '0.875rem',
      lineHeight: 'calc(1.25 / 0.875)',
      color: 'var(--ink-3)',
    },
  },
  pager: {
    '@layer site': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 0 8px',
      gap: '6px',
    },
  },
  pager_btn: {
    '@layer site': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '36px',
      height: '36px',
      padding: '0 10px',
      border: '1px solid var(--border)',
      borderColor: {
        default: 'var(--border)',
        ':hover:not(:disabled)':
          'color-mix(in oklab, var(--primary) 40%, var(--border))',
      },
      borderRadius: '10px',
      background: 'var(--surface)',
      fontFamily: 'var(--font-mono), monospace',
      fontSize: '13px',
      color: {
        default: 'var(--ink-2)',
        ':hover:not(:disabled)': 'var(--primary)',
      },
      cursor: {default: 'pointer', ':disabled': 'default'},
      opacity: {default: null, ':disabled': 0.35},
      transition:
        'border-color 180ms ease, background-color 180ms ease, color 180ms ease',
    },
  },
  pager_btn_active: {
    '@layer site': {
      borderColor: 'var(--ink)',
      background: 'var(--ink)',
      color: 'var(--bg)',
      cursor: 'default',
    },
  },
  preview_frame: {
    '@layer site': {
      position: 'relative',
      aspectRatio: '16 / 9',
      width: '100%',
      cursor: 'pointer',
      overflow: 'hidden',
      background: {
        default: '#fff',
        ':is(.dark *)': 'oklch(21% 0.006 285.885)',
      },
    },
  },
  preview_host: {
    '@layer site': {
      display: 'block',
      height: '100%',
      width: '100%',
    },
  },
})

export const sec_head = stylex.props(styles.sec_head).className!
export const sec_count = stylex.props(styles.sec_count).className!
export const sec_title = stylex.props(styles.sec_title).className!
export const sec_title_em = stylex.props(styles.sec_title_em).className!
export const sec_line = stylex.props(styles.sec_line).className!
export const sec_hint = stylex.props(styles.sec_hint).className!
export const card = stylex.props(styles.card).className!
export const card_link = stylex.props(styles.card_link).className!
export const thumb = stylex.props(styles.thumb).className!
export const body = stylex.props(styles.body).className!
export const tag_row = stylex.props(styles.tag_row).className!
export const card_title = stylex.props(styles.card_title).className!
export const card_desc = stylex.props(styles.card_desc).className!
export const meta = stylex.props(styles.meta).className!
export const meta_link = stylex.props(styles.meta_link).className!
export const draft_badge = stylex.props(styles.draft_badge).className!
export const tag_chip = stylex.props(styles.tag_chip).className!
export const filter_row = stylex.props(styles.filter_row).className!
export const filter_chip = stylex.props(styles.filter_chip).className!
export const filter_chip_on = stylex.props(
  styles.filter_chip,
  styles.filter_chip_on,
).className!
export const filter_count = stylex.props(styles.filter_count).className!
export const grid = stylex.props(styles.grid).className!
export const empty = stylex.props(styles.empty).className!
export const pager = stylex.props(styles.pager).className!
export const pager_btn = stylex.props(styles.pager_btn).className!
export const pager_btn_active = stylex.props(
  styles.pager_btn,
  styles.pager_btn_active,
).className!
export const preview_frame = stylex.props(styles.preview_frame).className!
export const preview_host = stylex.props(styles.preview_host).className!
