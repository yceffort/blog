import type {Metadata} from 'next'

import * as tagsStyles from '@/app/tags/tags.styles'
import * as heroStyles from '@/components/home/hero.styles'
import * as recentStyles from '@/components/home/recent.styles'
import * as ambientStyles from '@/components/layout/ambient.styles'
import SeriesRow from '@/components/series/SeriesRow'
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
    <div className={`page-view ${ambientStyles.page_view}`}>
      <section className={`page-hero ${tagsStyles.page_hero}`}>
        <div
          className={`hero-eyebrow ${heroStyles.hero_eyebrow} ${tagsStyles.hero_eyebrow}`}
        >
          <span className={`dot ${heroStyles.dot}`} />
          {series.length} SERIES · {totalPosts} POSTS
        </div>
        <h1 className={`page-title ${tagsStyles.page_title}`}>
          {'SERIES'}
          <span className={`accent ${heroStyles.accent} ${tagsStyles.accent}`}>
            ,
          </span>
          <br />
          <span className={`stroke ${heroStyles.stroke} ${tagsStyles.stroke}`}>
            one
          </span>
          {' thread.'}
        </h1>
        <p className={`page-sub ${tagsStyles.page_sub}`}>
          하나의 질문을 여러 편에 걸쳐 파고든 글 묶음입니다. 각 시리즈
          페이지에서 소개와 전체 목록을 볼 수 있습니다.
        </p>
      </section>
      <section className={`rec-list ${recentStyles.rec_list}`}>
        {series.map((s, i) => (
          <SeriesRow key={s.slug} series={s} index={i} />
        ))}
      </section>
    </div>
  )
}
