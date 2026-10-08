import type {Metadata} from 'next'
import Link from 'next/link'

import * as tagsStyles from '@/app/tags/tags.styles'
import * as heroStyles from '@/components/home/hero.styles'
import * as ambientStyles from '@/components/layout/ambient.styles'
import {SiteConfig} from '@/config'
import {buildOgImageUrl} from '@/utils/og'
import {getAllTagsFromPosts, type Locale} from '@/utils/Post'

const pathPrefixOf = (locale: Locale) => (locale === 'en' ? '/en' : '')

// tags 하위 페이지 전체(태그별 목록 포함)에 걸리는 기본 메타데이터
export function tagsLayoutMetadata(locale: Locale): Metadata {
  const pathPrefix = pathPrefixOf(locale)
  return {
    title: 'Tags - ' + SiteConfig.title,
    description: 'All posts by tags',
    openGraph: {
      title: 'Tags - ' + SiteConfig.title,
      description: 'All posts by tags',
      url: `${SiteConfig.url}${pathPrefix}/tags`,
      images: [
        {
          url: buildOgImageUrl({
            title: 'Tags - ' + SiteConfig.title,
            description: 'All posts by tags',
            path: `${pathPrefix}/tags`,
            type: 'page',
          }),
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export function tagsIndexMetadata(locale: Locale): Metadata {
  return {
    title: 'Tags',
    description: 'All tags',
    alternates: {
      canonical: `${SiteConfig.url}${pathPrefixOf(locale)}/tags`,
      languages:
        locale === 'en'
          ? {ko: `${SiteConfig.url}/tags`}
          : {en: `${SiteConfig.url}/en/tags`},
    },
  }
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

export default async function TagsIndexView({locale}: {locale: Locale}) {
  const pathPrefix = pathPrefixOf(locale)
  const tags = await getAllTagsFromPosts(locale)
  const totalPosts = tags.reduce((sum, t) => sum + t.count, 0)
  const maxCount = tags.reduce((max, t) => Math.max(max, t.count), 1)
  return (
    <div className={`page-view ${ambientStyles.page_view}`}>
      <section className={`page-hero ${tagsStyles.page_hero}`}>
        <div className={`hero-eyebrow ${tagsStyles.hero_eyebrow}`}>
          <span className={`dot ${heroStyles.dot}`} />
          {tags.length} TAGS · {totalPosts} POSTS
        </div>
        <h1 className={`page-title ${tagsStyles.page_title}`}>
          {'TAGS'}
          <span className={`accent ${tagsStyles.accent}`}>,</span>
          <br />
          <span className={`stroke ${tagsStyles.stroke}`}>every</span>
          {' topic.'}
        </h1>
        <p className={`page-sub ${tagsStyles.page_sub}`}>
          Topics grouped by tag. Click any chip to jump to the tag’s post list.
        </p>
      </section>
      <div className={`tag-grid ${tagsStyles.tag_grid}`}>
        {tags.map(({tag, count}, i) => {
          const size = 0.8 + (count / maxCount) * 1.2
          const [c1] = TAG_PALETTE[tagHash(tag)]
          return (
            <Link
              key={tag}
              href={`${pathPrefix}/tags/${tag}/pages/1`}
              className={`tchip ${tagsStyles.tchip}`}
              style={{
                fontSize: `${14 * size}px`,
                padding: `${8 * Math.sqrt(size)}px ${16 * Math.sqrt(size)}px`,
                ['--c1' as never]: c1,
                animationDelay: `${i * 32}ms`,
              }}
            >
              <span className={`n ${tagsStyles.n}`}>{tag}</span>
              <span className={`c ${tagsStyles.c}`}>{count}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
