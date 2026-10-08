import {cacheLife, cacheTag} from 'next/cache'

import Hero from '@/components/Hero'
import LayoutWrapper from '@/components/LayoutWrapper'
import {SlideListWithFilter, type Slide} from '@/components/SlideListWithFilter'
import {generateRenderedMarp} from '@/lib/marp'
import {getAllSlides} from '@/lib/slidesIndex'

interface HomeSlidesData {
  slides: Slide[]
  // 같은 테마를 쓰는 덱은 Marp CSS가 동일하므로, 덱마다 CSS 전체를 싣지 않고
  // 유니크한 CSS만 모아 인덱스로 참조한다 (홈 페이로드가 덱 수에 비례해 커지는 것 방지)
  cssList: string[]
}

async function getHomeSlides(): Promise<HomeSlidesData> {
  'use cache'
  cacheLife('hours')
  cacheTag('research:home')

  const cssList: string[] = []
  const cssIndexMap = new Map<string, number>()

  const isDev = process.env.NODE_ENV !== 'production'
  const slides = await Promise.all(
    getAllSlides()
      .filter((slide) => isDev || slide.published)
      // featured 덱을 맨 앞에 둔다. toSorted는 안정 정렬이라 나머지는 getAllSlides의 날짜순이 유지된다
      .toSorted((a, b) => Number(b.featured) - Number(a.featured))
      .map(async (slide): Promise<Slide> => {
        const {html, css, fonts} = await generateRenderedMarp(slide.markdown)

        let cssIndex = cssIndexMap.get(css)
        if (cssIndex === undefined) {
          cssIndex = cssList.push(css) - 1
          cssIndexMap.set(css, cssIndex)
        }

        return {
          slug: slide.slug,
          date: slide.date ?? null,
          tags: slide.tags ?? [],
          description: slide.description,
          title: slide.title,
          published: slide.published,
          featured: slide.featured,
          post: slide.post,
          slideCount: html.length,
          preview: {html: html[0] || '', cssIndex, fonts},
        }
      }),
  )

  return {slides, cssList}
}

export default async function Page() {
  const {slides, cssList} = await getHomeSlides()

  return (
    <LayoutWrapper>
      <Hero />
      <SlideListWithFilter slides={slides} cssList={cssList} />
    </LayoutWrapper>
  )
}
