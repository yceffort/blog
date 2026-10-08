import {stripTitleEmphasis} from '@yceffort/shared/utils'

import {SiteConfig} from '@/config'
import type {Post} from '@/type'
import {getAllPosts} from '@/utils/Post'

function postLine(post: Post, urlPrefix: string) {
  const desc = post.frontMatter.description
    ? `: ${post.frontMatter.description}`
    : ''
  const url = `${urlPrefix}/${post.fields.slug}.md`
  return `- [${stripTitleEmphasis(post.frontMatter.title)}](${url})${desc}`
}

export async function GET() {
  const [koPosts, enPosts] = await Promise.all([
    getAllPosts('ko'),
    getAllPosts('en'),
  ])

  const lines: string[] = []
  lines.push(`# ${SiteConfig.title}`)
  lines.push('')
  lines.push(`> ${SiteConfig.subtitle}. Personal engineering blog.`)
  lines.push('')
  lines.push('## Posts')
  lines.push('')

  for (const post of koPosts) {
    lines.push(postLine(post, SiteConfig.url))
  }

  if (enPosts.length > 0) {
    lines.push('')
    lines.push('## Posts (English)')
    lines.push('')
    for (const post of enPosts) {
      lines.push(postLine(post, `${SiteConfig.url}/en`))
    }
  }

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
    },
  })
}
