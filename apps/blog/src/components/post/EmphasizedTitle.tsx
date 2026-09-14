import {parseTitleEmphasis} from '@yceffort/shared/utils'

import {list_em, title_em} from '@/components/post/reading-progress.styles'

export function EmphasizedTitle({
  title,
  variant = 'list',
}: {
  title: string
  variant?: 'title' | 'list'
}) {
  const titleEmphasisClassName = variant === 'title' ? title_em : list_em
  return parseTitleEmphasis(title).map((part, index) =>
    part.emphasis ? (
      <em key={index} className={titleEmphasisClassName}>
        {part.text}
      </em>
    ) : (
      part.text
    ),
  )
}
