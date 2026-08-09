import type {Metadata} from 'next'

import SeriesRow from '@/components/SeriesRow'
import {SiteConfig} from '@/config'
import {getAllSeries} from '@/utils/Series'

export const metadata: Metadata = {
  title: 'Series',
  description: 'All series',
  alternates: {
    canonical: `${SiteConfig.url}/series`,
  },
}

export default async function SeriesPage() {
  const series = await getAllSeries()
  const totalPosts = series.reduce((sum, s) => sum + s.posts.length, 0)

  return (
    <div className="page-view">
      <section className="page-hero">
        <div className="hero-eyebrow">
          <span className="dot" />
          {series.length} SERIES · {totalPosts} POSTS
        </div>
        <h1 className="page-title">
          SERIES<span className="accent">,</span>
          <br />
          <span className="stroke">one</span> thread.
        </h1>
        <p className="page-sub">
          하나의 질문을 여러 편에 걸쳐 파고든 글 묶음입니다. 각 시리즈
          페이지에서 소개와 전체 목록을 볼 수 있습니다.
        </p>
      </section>
      <section className="rec-list">
        {series.map((s, i) => (
          <SeriesRow key={s.slug} series={s} index={i} />
        ))}
      </section>
    </div>
  )
}
