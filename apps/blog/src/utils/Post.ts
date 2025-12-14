import fs from 'fs'

import frontMatter from 'front-matter'
import {sync} from 'glob'
import readingTime from 'reading-time'

import type {FrontMatter, Post, TagWithCount} from '../type'

const DIR_REPLACE_STRING = '/posts'

const POST_PATH = `${process.cwd()}${DIR_REPLACE_STRING}`

export async function findPostByYearAndSlug(year: string, slug: string[]) {
  const slugs = [year, ...slug].join('/')
  const posts = await getAllPosts()
  return posts.find((p) => p?.fields?.slug === slugs)
}

export async function getAllPosts(): Promise<Post[]> {
  const files = sync(`${POST_PATH}/**/*.md*`).reverse()

  const posts = files
    .reduce<Post[]>((prev, path) => {
      const file = fs.readFileSync(path, {encoding: 'utf8'})
      const {attributes, body} = frontMatter<FrontMatter>(file)
      const fm: FrontMatter = attributes
      const {tags: fmTags, published, date} = fm

      const slug = path
        .slice(path.indexOf(DIR_REPLACE_STRING) + DIR_REPLACE_STRING.length + 1)
        .replace('.mdx', '')
        .replace('.md', '')

      if (published) {
        const tags: string[] = (fmTags || []).map((tag: string) => tag.trim())
        const stats = readingTime(body, {wordsPerMinute: 250})

        const result: Post = {
          frontMatter: {
            ...fm,
            tags,
            date: new Date(date).toISOString().substring(0, 19),
          },
          body,
          fields: {
            slug,
          },
          path,
          readingTime: Math.max(1, Math.ceil(stats.minutes)),
        }
        prev.push(result)
      }
      return prev
    }, [])
    .sort((a, b) => {
      if (a.frontMatter.date < b.frontMatter.date) {
        return 1
      }
      if (a.frontMatter.date > b.frontMatter.date) {
        return -1
      }
      return 0
    })

  return posts
}

export async function getAllTagsFromPosts(): Promise<TagWithCount[]> {
  const posts = await getAllPosts()
  const tagCountMap = new Map<string, number>()

  for (const post of posts) {
    for (const tag of post.frontMatter.tags) {
      tagCountMap.set(tag, (tagCountMap.get(tag) ?? 0) + 1)
    }
  }

  return Array.from(tagCountMap.entries())
    .map(([tag, count]) => ({tag, count}))
    .sort((a, b) => b.count - a.count)
}

export async function getSeriesPosts(seriesName: string): Promise<Post[]> {
  const posts = await getAllPosts()
  return posts
    .filter((post) => post.frontMatter.series === seriesName)
    .sort(
      (a, b) =>
        (a.frontMatter.seriesOrder ?? 0) - (b.frontMatter.seriesOrder ?? 0),
    )
}
