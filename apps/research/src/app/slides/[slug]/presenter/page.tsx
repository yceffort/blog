import {notFound} from 'next/navigation'

import {PresenterView} from '@/components/PresenterView'
import {getRenderedSlide, getSlideStaticParams} from '@/lib/slidesIndex'

export const generateStaticParams = getSlideStaticParams

export async function generateMetadata(props: {
  params: Promise<{slug: string}>
}) {
  const params = await props.params
  const data = await getRenderedSlide(params.slug)
  if (!data) {
    return {title: `Not Found - ${params.slug}`}
  }

  return {
    title: `발표자 모드 - ${data.title}`,
  }
}

export default async function PresenterPage(props: {
  params: Promise<{slug: string}>
}) {
  const params = await props.params
  const data = await getRenderedSlide(params.slug)
  if (!data) {
    notFound()
    return null
  }

  const {html, css, fonts, notes} = data

  return (
    <PresenterView
      dataHtml={JSON.stringify(html)}
      dataCss={css}
      dataFonts={JSON.stringify(fonts)}
      dataNotes={JSON.stringify(notes)}
      slug={params.slug}
    />
  )
}
