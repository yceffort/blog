import {SiteConfig} from '@/config'
import {getAllSlides} from '@/lib/slidesIndex'

export function GET() {
  const slides = getAllSlides().filter((s) => s.published)

  const parts: string[] = []
  parts.push(`# ${SiteConfig.title} — ${SiteConfig.subtitle}`)
  parts.push('')
  parts.push(
    '> Full markdown of every published slide. Each slide is separated by a thematic break.',
  )
  parts.push('')

  for (const slide of slides) {
    parts.push('---')
    parts.push('')
    parts.push(`# ${slide.title}`)
    parts.push('')
    parts.push(`Source: ${SiteConfig.url}/slides/${slide.slug}.md`)
    parts.push('')
    parts.push(slide.markdown.trim())
    parts.push('')
  }

  return new Response(parts.join('\n') + '\n', {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
}
