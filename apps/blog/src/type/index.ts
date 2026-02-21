export interface FrontMatter {
  title: string
  category: string
  tags: string[]
  published: boolean
  date: string
  description: string
  template: string
  path: string
  socialImageUrl?: string
  socialImageCredit?: string
  series?: string
  seriesOrder?: number
  featured?: boolean
  thumbnail?: string
}

export interface Post {
  fields: {
    slug: string
  }
  frontMatter: FrontMatter
  body: string
  path: string
  readingTime: number
}

export interface TagWithCount {
  tag: string
  count: number
}
