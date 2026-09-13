import {parseTitleEmphasis} from '@yceffort/shared/utils'

import {element_em as titleEmphasisClassName} from '@/components/post/reading-progress.styles'

export function EmphasizedTitle({title}: {title: string}) {
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
