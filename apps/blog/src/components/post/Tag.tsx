import * as stylex from '@stylexjs/stylex'
import Link from 'next/link'

const sx = stylex.create({
  tagClassName: {
    '@layer utilities': {
      borderRadius: 'calc(infinity * 1px)',
      backgroundColor: {
        default: 'oklch(96.7% 0.001 286.375)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'oklch(96.2% 0.018 272.314)',
          ':is(.dark *):hover':
            'color-mix(in oklab, oklch(35.9% 0.144 278.697) 40%, transparent)',
        },
        ':is(.dark *)':
          'color-mix(in oklab, oklch(37% 0.013 285.805) 50%, transparent)',
      },
      paddingInline: 'calc(var(--spacing) * 2.5)',
      paddingBlock: 'var(--spacing)',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--blog-leading, var(--text-xs--line-height))',
      fontWeight: 'var(--font-weight-medium)',
      color: {
        default: 'oklch(44.2% 0.017 285.786)',
        '@media (hover: hover)': {
          default: null,
          ':hover': 'oklch(45.7% 0.24 277.023)',
          ':is(.dark *):hover': 'oklch(78.5% 0.115 274.713)',
        },
        ':is(.dark *)': 'oklch(87.1% 0.006 286.286)',
      },
      transitionProperty:
        'color, background-color, border-color, outline-color, text-decoration-color, fill, stroke, --blog-gradient-from, --blog-gradient-via, --blog-gradient-to',
      transitionTimingFunction:
        'var(--blog-ease, var(--default-transition-timing-function))',
      transitionDuration:
        'var(--blog-duration, var(--default-transition-duration))',
    },
  },
})
const tagClassName = stylex.props(sx.tagClassName).className
const Tag = ({text, linked = true}: {text: string; linked?: boolean}) => {
  const label = text.split(' ').join('-')
  if (!linked) {
    return <span className={tagClassName}>{label}</span>
  }
  return (
    <Link href={`/tags/${text}`} className={tagClassName}>
      {label}
    </Link>
  )
}
export default Tag
