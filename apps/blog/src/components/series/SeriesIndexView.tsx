import type {Metadata} from 'next'

import * as tagsStyles from '@/app/tags/tags.styles'
import * as heroStyles from '@/components/home/hero.styles'
import * as recentStyles from '@/components/home/recent.styles'
import * as ambientStyles from '@/components/layout/ambient.styles'
import SeriesRow from '@/components/series/SeriesRow'
import {SiteConfig} from '@/config'
import type {Locale} from '@/utils/Post'
import {getAllSeries} from '@/utils/Series'

const LABELS = {
  ko: {
    pathPrefix: '',
    sub: '하나의 질문을 여러 편에 걸쳐 파고든 글 묶음입니다. 각 시리즈 페이지에서 소개와 전체 목록을 볼 수 있습니다.',
  },
  en: {
    pathPrefix: '/en',
    sub: 'Collections of posts that dig into a single question across several parts. Each series page has an introduction and the full list.',
  },
} as const

export function seriesIndexMetadata(locale: Locale): Metadata {
  const {pathPrefix} = LABELS[locale]
  return {
    title: 'Series',
    description: 'All series',
    alternates: {
      canonical: `${SiteConfig.url}${pathPrefix}/series`,
      languages:
        locale === 'en'
          ? {ko: `${SiteConfig.url}/series`}
          : {en: `${SiteConfig.url}/en/series`},
    },
  }
}

export default async function SeriesIndexView({locale}: {locale: Locale}) {
  const {pathPrefix, sub} = LABELS[locale]
  const series = await getAllSeries(locale)
  const totalPosts = series.reduce((sum, s) => sum + s.posts.length, 0)
  return (
    <div className={`page-view ${ambientStyles.page_view}`}>
      <section className={`page-hero ${tagsStyles.page_hero}`}>
        <div className={`hero-eyebrow ${tagsStyles.hero_eyebrow}`}>
          <span className={`dot ${heroStyles.dot}`} />
          {series.length} SERIES · {totalPosts} POSTS
        </div>
        <h1 className={`page-title ${tagsStyles.page_title}`}>
          {'SERIES'}
          <span className={`accent ${tagsStyles.accent}`}>,</span>
          <br />
          <span className={`stroke ${tagsStyles.stroke}`}>one</span>
          {' thread.'}
        </h1>
        <p className={`page-sub ${tagsStyles.page_sub}`}>{sub}</p>
      </section>
      <section className={`rec-list ${recentStyles.rec_list}`}>
        {series.map((s, i) => (
          <SeriesRow
            key={s.slug}
            series={s}
            index={i}
            pathPrefix={pathPrefix}
          />
        ))}
      </section>
    </div>
  )
}
