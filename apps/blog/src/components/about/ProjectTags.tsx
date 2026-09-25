import * as projectTagsStyles from '@/components/about/ProjectTags.styles'
import type {Locale} from '@/utils/postPaths'
export function ProjectTags({
  tags,
  locale = 'ko',
}: {
  tags: string[]
  locale?: Locale
}) {
  return (
    <ul
      aria-label={locale === 'en' ? 'Main technologies' : '주요 사용 기술'}
      className={`markdown-exempt projecttags-tags ${projectTagsStyles.projecttags_tags}`}
    >
      {tags.map((tag) => (
        <li key={tag} className={projectTagsStyles.element_li}>
          #{tag}
        </li>
      ))}
    </ul>
  )
}
