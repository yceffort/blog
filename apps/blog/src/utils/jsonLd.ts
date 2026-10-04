import {SiteConfig} from '@/config'
import {toInstant} from '@/utils/postDate'

export function buildBlogPostingJsonLd({
  title,
  description,
  date,
  updated,
  tags,
  imageUrl,
  url,
  inLanguage,
}: {
  title: string
  description?: string
  date: string
  updated?: string
  tags?: string[]
  imageUrl: string
  url: string
  inLanguage: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    datePublished: toInstant(date).toISOString(),
    dateModified: toInstant(updated ?? date).toISOString(),
    description,
    image: imageUrl,
    url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    inLanguage,
    keywords: tags,
    author: {
      '@type': 'Person',
      name: SiteConfig.author.name,
      url: SiteConfig.url,
    },
    publisher: {
      '@type': 'Person',
      name: SiteConfig.author.name,
      url: SiteConfig.url,
    },
  }
}

export function buildBreadcrumbJsonLd(items: {name: string; url: string}[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
