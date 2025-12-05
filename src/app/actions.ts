'use server'

import type {Post} from '#src/type'

import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'
import {getAllPosts} from '#utils/Post'

export async function fetchPosts(page: number): Promise<Post[]> {
  const allPosts = await getAllPosts()
  const startIndex = (page - 1) * DEFAULT_NUMBER_OF_POSTS
  const endIndex = startIndex + DEFAULT_NUMBER_OF_POSTS

  // Strip body to reduce payload
  return allPosts.slice(startIndex, endIndex).map((post) => ({
    ...post,
    body: '',
  }))
}
