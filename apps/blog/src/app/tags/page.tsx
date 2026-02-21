import Link from 'next/link'

import type {Metadata} from 'next'

import {getAllTagsFromPosts} from '#utils/Post'

export const metadata: Metadata = {
  title: 'Tags',
  description: 'All tags',
}

const TAG_STYLES = [
  'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
  'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
]

function getStyleIndex(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % TAG_STYLES.length
}

export default async function TagsPage() {
  const tags = await getAllTagsFromPosts()

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl font-black leading-9 tracking-tight text-black dark:text-white sm:text-4xl sm:leading-10 md:text-6xl md:leading-14">
          Tags
        </h1>
      </div>
      <div className="flex flex-wrap gap-3 pt-8">
        {tags.map(({tag, count}) => (
          <Link
            key={tag}
            href={`/tags/${tag}/pages/1`}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${TAG_STYLES[getStyleIndex(tag)]}`}
          >
            {tag}
            <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/10">
              {count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
