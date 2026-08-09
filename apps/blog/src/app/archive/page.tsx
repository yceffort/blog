import {stripTitleEmphasis} from '@yceffort/shared/utils'
import type {Metadata} from 'next'
import Link from 'next/link'

import {SiteConfig} from '@/config'
import type {Post} from '@/type'
import {getAllPosts} from '@/utils/Post'

export const metadata: Metadata = {
  title: 'Archive',
  description: `${SiteConfig.title}의 전체 글을 연도별로 모아봅니다.`,
  alternates: {
    canonical: `${SiteConfig.url}/archive`,
  },
}

export default async function ArchivePage() {
  const posts = await getAllPosts('ko')

  const byYear = new Map<number, Post[]>()
  for (const post of posts) {
    const year = new Date(post.frontMatter.date).getFullYear()
    const bucket = byYear.get(year)
    if (bucket) {
      bucket.push(post)
    } else {
      byYear.set(year, [post])
    }
  }
  const years = [...byYear.keys()].toSorted((a, b) => b - a)

  return (
    <div className="page-view archive-view">
      <header className="archive-head">
        <span className="sec-count">ARCHIVE</span>
        <h1>전체 글</h1>
        <p className="archive-sub">
          {posts.length}개의 글 · {years.length}개 연도
        </p>
      </header>

      {years.map((year) => {
        const yearPosts = byYear.get(year) ?? []
        return (
          <section key={year} id={`${year}`} className="archive-year">
            <div className="archive-year-head">
              <h2>{year}</h2>
              <span>{yearPosts.length}</span>
            </div>
            <ul className="archive-list">
              {yearPosts.map((post) => (
                <li key={post.fields.slug}>
                  <Link
                    href={`/${post.fields.slug}`}
                    className="archive-item"
                    prefetch={false}
                  >
                    <span className="archive-date">
                      {post.frontMatter.date.slice(5, 10)}
                    </span>
                    <span className="archive-title">
                      {stripTitleEmphasis(post.frontMatter.title)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
