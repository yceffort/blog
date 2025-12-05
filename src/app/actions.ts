'use server'

import postsCache from '../../.posts-cache.json' with {type: 'json'}

import type {Post} from '#src/type'

import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'

export async function fetchPosts(page: number): Promise<Post[]> {
  const allPosts = postsCache as Post[]
  const startIndex = (page - 1) * DEFAULT_NUMBER_OF_POSTS
  const endIndex = startIndex + DEFAULT_NUMBER_OF_POSTS

  return allPosts.slice(startIndex, endIndex)
}
