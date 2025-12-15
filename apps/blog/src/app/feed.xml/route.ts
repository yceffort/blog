import {NextResponse} from 'next/server'

import {SiteConfig} from '#src/config'
import {getAllPosts} from '#utils/Post'

export async function GET() {
  const allPosts = await getAllPosts()

  // Generate RSS feed XML
  const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SiteConfig.title}</title>
    <link>${SiteConfig.url}</link>
    <atom:link href="${SiteConfig.url}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${SiteConfig.subtitle}</description>
    <language>ko-KR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${allPosts
      .map((post) => {
        const postDate = new Date(post.frontMatter.date)
        const postUrl = `${SiteConfig.url}/${post.fields.slug}`
        const postDescription =
          post.frontMatter.description || post.body.substring(0, 150) + '...' // Use description or first 150 chars of body

        return `
        <item>
          <title><![CDATA[${post.frontMatter.title}]]></title>
          <link>${postUrl}</link>
          <guid>${postUrl}</guid>
          <pubDate>${postDate.toUTCString()}</pubDate>
          <description><![CDATA[${postDescription}]]></description>
          ${post.frontMatter.tags
            .map((tag) => `<category><![CDATA[${tag}]]></category>`)
            .join('')}
        </item>
      `
      })
      .join('')}
  </channel>
</rss>`

  return new NextResponse(feedXml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  })
}
