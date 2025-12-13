import type {MetadataRoute} from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemaps: [
      'https://yceffort.kr/sitemap.xml',
      'https://yceffort.kr/feed.xml', // Add RSS feed to sitemaps
    ],
  }
}
