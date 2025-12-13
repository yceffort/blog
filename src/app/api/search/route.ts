import {NextResponse} from 'next/server'

import {getAllPosts, getAllTagsFromPosts} from '#utils/Post'

export const dynamic = 'force-dynamic'

export async function GET() {
  const posts = await getAllPosts()
  const tags = await getAllTagsFromPosts()

  const postsForSearch = posts.map((p) => ({
    frontMatter: {
      title: p.frontMatter.title,
      tags: p.frontMatter.tags,
      description: p.frontMatter.description,
    },
    fields: {slug: p.fields.slug},
  }))

  return NextResponse.json({
    posts: postsForSearch,
    tags,
  })
}
