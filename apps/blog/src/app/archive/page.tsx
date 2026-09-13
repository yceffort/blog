import {stripTitleEmphasis} from '@yceffort/shared/utils'
import type {Metadata} from 'next'
import Link from 'next/link'

import * as archiveStyles from '@/app/archive/archive.styles'
import * as ambientStyles from '@/components/layout/ambient.styles'
import * as sectionStyles from '@/components/layout/section.styles'
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
    <div className={`page-view archive-view ${ambientStyles.page_view}`}>
      <header className={`archive-head ${archiveStyles.archive_head}`}>
        <span
          className={`sec-count ${sectionStyles.sec_count} ${archiveStyles.element_span}`}
        >
          ARCHIVE
        </span>
        <h1 className={archiveStyles.element_h1}>전체 글</h1>
        <p className={`archive-sub ${archiveStyles.archive_sub}`}>
          {posts.length}개의 글 · {years.length}개 연도
        </p>
      </header>

      {years.map((year) => {
        const yearPosts = byYear.get(year) ?? []
        return (
          <section
            key={year}
            id={`${year}`}
            className={`archive-year ${archiveStyles.archive_year}`}
          >
            <div
              className={`archive-year-head ${archiveStyles.archive_year_head}`}
            >
              <h2 className={archiveStyles.element_h2}>{year}</h2>
              <span className={archiveStyles.element_span}>
                {yearPosts.length}
              </span>
            </div>
            <ul className={`archive-list ${archiveStyles.archive_list}`}>
              {yearPosts.map((post) => (
                <li key={post.fields.slug}>
                  <Link
                    href={`/${post.fields.slug}`}
                    className={`archive-item ${archiveStyles.archive_item}`}
                    prefetch={false}
                  >
                    <span
                      className={`archive-date ${archiveStyles.archive_date} ${archiveStyles.element_span}`}
                    >
                      {post.frontMatter.date.slice(5, 10)}
                    </span>
                    <span
                      className={`archive-title ${archiveStyles.archive_title} ${archiveStyles.element_span}`}
                    >
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
