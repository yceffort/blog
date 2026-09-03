/** 코드 생성 썸네일 스펙. scripts/generate-art-spec.mjs 가 본문에서 뽑아 frontmatter `art`에 쓴다 */
export interface ArtSpec {
  layout?: string
  hue?: string
  tone?: 'light' | 'dark'
  hero?: string
}

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
  art?: ArtSpec
  /** 대응하는 research 발표 슬라이드의 slug (research.yceffort.kr/slides/{slide}) */
  slide?: string
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

export interface Series {
  slug: string
  name: string
  title: string
  description: string
  body: string
  path: string
  posts: Post[]
}
