import type {Metadata} from 'next'
import Link from 'next/link'

import {SiteConfig} from '@/config'
import {getAllTagsFromPosts} from '@/utils/Post'

export const metadata: Metadata = {
  title: 'Tags',
  description: 'All tags',
  alternates: {
    canonical: `${SiteConfig.url}/tags`,
  },
}

const TAG_PALETTE: [string, string][] = [
  ['#a78bfa', '#6d28d9'],
  ['#f472b6', '#9d174d'],
  ['#fbbf24', '#92400e'],
  ['#38bdf8', '#0369a1'],
  ['#34d399', '#065f46'],
  ['#fb923c', '#9a3412'],
  ['#a3e635', '#365314'],
  ['#f87171', '#991b1b'],
  ['#c084fc', '#6b21a8'],
  ['#60a5fa', '#1e40af'],
]

function tagHash(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % TAG_PALETTE.length
}

export default async function TagsPage() {
  const tags = await getAllTagsFromPosts()
  const totalPosts = tags.reduce((sum, t) => sum + t.count, 0)
  const maxCount = tags.reduce((max, t) => Math.max(max, t.count), 1)

  return (
    <div className="page-view">
      <section className="page-hero">
        <div className="hero-eyebrow">
          <span className="dot" />
          {tags.length} TAGS · {totalPosts} POSTS
        </div>
        <h1 className="page-title">
          TAGS<span className="accent">,</span>
          <br />
          <span className="stroke">every</span> topic.
        </h1>
        <p className="page-sub">
          Topics grouped by tag. Click any chip to jump to the tag’s post list.
        </p>
      </section>
      <div className="tag-grid">
        {tags.map(({tag, count}, i) => {
          const size = 0.8 + (count / maxCount) * 1.2
          const [c1] = TAG_PALETTE[tagHash(tag)]
          return (
            <Link
              key={tag}
              href={`/tags/${tag}/pages/1`}
              className="tchip"
              style={{
                fontSize: `${14 * size}px`,
                padding: `${8 * Math.sqrt(size)}px ${16 * Math.sqrt(size)}px`,
                ['--c1' as never]: c1,
                animationDelay: `${i * 32}ms`,
              }}
            >
              <span className="n">{tag}</span>
              <span className="c">{count}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
