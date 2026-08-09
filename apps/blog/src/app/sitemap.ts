import type {MetadataRoute} from 'next'

import {getAllPosts, getAllTagsFromPosts} from '@/utils/Post'
import {getAllSeries} from '@/utils/Series'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, enPosts, tags, series] = await Promise.all([
    getAllPosts(),
    getAllPosts('en'),
    getAllTagsFromPosts(),
    getAllSeries(),
  ])

  const enSlugs = new Set(enPosts.map((p) => p.fields.slug))

  return [
    {
      url: 'https://yceffort.kr',
      lastModified: new Date(),
    },
    {
      url: 'https://yceffort.kr/about',
      lastModified: new Date(),
    },
    {
      url: 'https://yceffort.kr/archive',
      lastModified: new Date(),
    },
    {
      url: 'https://yceffort.kr/resume',
      lastModified: new Date(),
    },
    ...posts.map((post) => ({
      url: `https://yceffort.kr/${post.fields.slug}`,
      lastModified: new Date(post.frontMatter.date),
      ...(enSlugs.has(post.fields.slug) && {
        alternates: {
          languages: {
            ko: `https://yceffort.kr/${post.fields.slug}`,
            en: `https://yceffort.kr/en/${post.fields.slug}`,
          },
        },
      }),
    })),
    ...enPosts.map((post) => ({
      url: `https://yceffort.kr/en/${post.fields.slug}`,
      lastModified: new Date(post.frontMatter.date),
      alternates: {
        languages: {
          ko: `https://yceffort.kr/${post.fields.slug}`,
          en: `https://yceffort.kr/en/${post.fields.slug}`,
        },
      },
    })),
    ...tags.map((tag) => ({
      url: `https://yceffort.kr/tags/${tag}`,
    })),
    {
      url: 'https://yceffort.kr/series',
      lastModified: new Date(),
    },
    ...series.map((s) => ({
      url: `https://yceffort.kr/series/${s.slug}`,
      lastModified: new Date(),
    })),
  ]
}
