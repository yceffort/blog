import Link from 'next/link'

const Tag = ({text}: {text: string}) => {
  return (
    <Link href={`/tags/${text}`} className="mr-3 text-sm font-bold uppercase">
      <span className="border border-black bg-white px-3 py-1 text-xs font-bold text-black shadow-brutal-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-primary-100 hover:shadow-none dark:border-white dark:bg-gray-800 dark:text-white dark:hover:bg-primary-900 dark:hover:text-white">
        {text.split(' ').join('-')}
      </span>
    </Link>
  )
}

export default Tag
