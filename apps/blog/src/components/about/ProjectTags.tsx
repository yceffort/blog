import * as projectTagsStyles from '@/components/about/ProjectTags.styles'
export function ProjectTags({tags}: {tags: string[]}) {
  return (
    <ul
      aria-label="주요 사용 기술"
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
