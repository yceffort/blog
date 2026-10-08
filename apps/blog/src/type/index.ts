/** 코드 생성 썸네일 스펙. frontmatter `art`에서 읽는다 */
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
  /** 본문을 마지막으로 고친 시각. pre-commit 훅(scripts/stamp-post-updated.mjs)이 갱신한다 */
  updated?: string
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
