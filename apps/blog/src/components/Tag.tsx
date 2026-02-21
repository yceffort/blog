import Link from 'next/link'

const Tag = ({text}: {text: string}) => {
  return (
    <Link
      href={`/tags/${text}`}
      className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:bg-gray-700/50 dark:text-gray-300 dark:hover:bg-primary-900/40 dark:hover:text-primary-300"
    >
      {text.split(' ').join('-')}
    </Link>
  )
}

export default Tag
