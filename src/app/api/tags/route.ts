import {NextResponse} from 'next/server'

import {getAllTagsFromPosts} from '#utils/Post'

export async function GET() {
  const tags = await getAllTagsFromPosts()
  return NextResponse.json({tags})
}
