import {notFound} from 'next/navigation'

import {MarpSlides} from '@/components/MarpSlides'
import {SiteConfig} from '@/config'
import {getRenderedSlide, getSlideStaticParams} from '@/lib/slidesIndex'

import {devBanner} from '../devBanner.styles'

export const generateStaticParams = getSlideStaticParams

export async function generateMetadata(props: {
  params: Promise<{slug: string}>
}) {
  const params = await props.params
  const data = await getRenderedSlide(params.slug)
  if (!data) {
    return {title: `Not Found - ${params.slug}`}
  }

  const ogImageUrl =
    data.thumbnail ??
    `/api/og?title=${encodeURIComponent(data.title)}&description=${encodeURIComponent(data.description || '')}&tags=${encodeURIComponent((data.tags || []).join(','))}&path=${encodeURIComponent('/slides/' + params.slug)}`

  return {
    title: data.title,
    description: data.description,
    robots: data.published ? undefined : {index: false, follow: false},
    alternates: {
      canonical: `${SiteConfig.url}/slides/${params.slug}`,
      types: {
        'text/markdown': `${SiteConfig.url}/slides/${params.slug}.md`,
      },
    },
    openGraph: {
      title: data.title,
      description: data.description,
      url: `${SiteConfig.url}/slides/${params.slug}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.description,
      images: [ogImageUrl],
    },
  }
}

export default async function SlidePage(props: {
  params: Promise<{slug: string}>
}) {
  const params = await props.params
  const data = await getRenderedSlide(params.slug)
  if (!data) {
    notFound()
    return null
  }

  const isDev = process.env.NODE_ENV !== 'production'

  const {html, css, fonts, published, post, transition} = data

  return (
    <div>
      <MarpSlides
        dataHtml={JSON.stringify(html)}
        dataCss={css}
        dataFonts={JSON.stringify(fonts)}
        slug={params.slug}
        postUrl={post}
        defaultTransition={transition}
      />
      {isDev && !published && (
        <div className={devBanner}>
          ⚠️ 배포되지 않은 포스트입니다 (dev only)
        </div>
      )}
    </div>
  )
}
