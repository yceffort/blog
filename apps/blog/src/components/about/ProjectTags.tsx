import styles from './ProjectTags.module.scss'

export function ProjectTags({tags}: {tags: string[]}) {
  return (
    <ul aria-label="주요 사용 기술" className={`not-prose ${styles.tags}`}>
      {tags.map((tag) => (
        <li key={tag}>#{tag}</li>
      ))}
    </ul>
  )
}
