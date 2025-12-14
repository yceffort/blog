import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'

import frontMatter from 'front-matter'
import {sync} from 'glob'
import readingTime from 'reading-time'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const POST_PATH = path.join(__dirname, '../posts')
const OUTPUT_PATH = path.join(__dirname, '../.posts-cache.json')

function generatePostsCache() {
  const files = sync(`${POST_PATH}/**/*.md*`).reverse()

  const posts = files
    .reduce((prev, filePath) => {
      const file = fs.readFileSync(filePath, {encoding: 'utf8'})
      const {attributes, body} = frontMatter(file)
      const {tags: fmTags, published, date} = attributes

      const slug = filePath
        .slice(filePath.indexOf('/posts') + '/posts'.length + 1)
        .replace('.mdx', '')
        .replace('.md', '')

      if (published) {
        const tags = (fmTags || []).map((tag) => tag.trim())
        const stats = readingTime(body, {wordsPerMinute: 250})

        prev.push({
          frontMatter: {
            ...attributes,
            tags,
            date: new Date(date).toISOString().substring(0, 19),
          },
          body: '',
          fields: {slug},
          path: filePath,
          readingTime: Math.max(1, Math.ceil(stats.minutes)),
        })
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

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(posts, null, 2))
  // eslint-disable-next-line no-console
  console.log(`Generated posts cache with ${posts.length} posts`)
}

generatePostsCache()
