import {NextResponse} from 'next/server'

import {getAllTagsFromPosts} from '#utils/Post'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tags = await getAllTagsFromPosts()
    return NextResponse.json({tags})
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API/tags] Error fetching tags:', error)
    return NextResponse.json({tags: []}, {status: 500})
  }
}
