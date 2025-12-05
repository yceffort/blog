import {redirect} from 'next/navigation'

import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'
import {getAllPosts} from '#utils/Post'

export const dynamic = 'error'

export async function generateMetadata(props: {params: Promise<{id: string}>}) {
  const params = await props.params
  const {id} = params
  return {
    title: `Page ${id}`,
  }
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return [
    ...new Array(Math.round(posts.length / DEFAULT_NUMBER_OF_POSTS)).keys(),
  ].map((i) => ({id: `${i + 1}`}))
}

export default async function Page(props: {params: Promise<{id: string}>}) {
  const params = await props.params
  redirect(`/?page=${params.id}`)
}
