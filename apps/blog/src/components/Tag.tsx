import Link from 'next/link'

const tagClassName =
  'rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-primary-900/40 dark:hover:text-primary-300'

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
