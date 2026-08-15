import {SiteConfig} from '@/config'
import {getAllSlides} from '@/lib/slidesIndex'

export function GET() {
  const slides = getAllSlides().filter((s) => s.published)

  const lines: string[] = []
  lines.push(`# ${SiteConfig.title} — ${SiteConfig.subtitle}`)
  lines.push('')
  lines.push(
    '> Slides and research notes. Each slide is authored in Markdown with Marp directives.',
  )
  lines.push('')
  lines.push('## Slides')
  lines.push('')

  for (const slide of slides) {
    const desc = slide.description ? `: ${slide.description}` : ''
    lines.push(
      `- [${slide.title}](${SiteConfig.url}/slides/${slide.slug}.md)${desc}`,
    )
  }

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
}
