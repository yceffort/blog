import type {MetadataRoute} from 'next'

import {SiteConfig} from '@/config'
import {getPublishedSlides} from '@/lib/slidesIndex'

export default function sitemap(): MetadataRoute.Sitemap {
  const slides = getPublishedSlides()

  return [
    {
      url: `${SiteConfig.url}/`,
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...slides.map((slide) => ({
      url: `${SiteConfig.url}/slides/${slide.slug}`,
      lastModified: slide.date ? new Date(slide.date) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
