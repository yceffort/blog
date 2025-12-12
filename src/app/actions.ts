'use server'

import fs from 'fs'
import path from 'path'

import type {Post} from '#src/type'

import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'

export async function fetchPosts(page: number): Promise<Post[]> {
  const filePath = path.join(process.cwd(), '.posts-cache.json')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  const allPosts = JSON.parse(fileContents) as Post[]

  const startIndex = (page - 1) * DEFAULT_NUMBER_OF_POSTS
  const endIndex = startIndex + DEFAULT_NUMBER_OF_POSTS

  return allPosts.slice(startIndex, endIndex)
}
