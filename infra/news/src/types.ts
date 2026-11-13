export interface Article {
  title: string
  url: string
  description: string
  source: string
  sourceKind: 'rss' | 'hn' | 'trending'
  publishedAt: string
  score?: number
}

// 본문까지 뽑은 상태. 아직 출처가 정해지지 않았다.
export interface Extracted extends Article {
  content: string
  contentSource: 'readability' | 'firecrawl'
}

export interface Candidate extends Extracted {
  // Hacker News나 Lobsters를 거쳐 온 글은 그쪽이 아니라 원래 사이트가 출처다.
  origin: string
  via: string | null
}

export interface FeedSource {
  name: string
  url: string
  group: string
}

export interface FetchReport {
  source: string
  ok: boolean
  count: number
  error?: string
}

// 큐레이터가 먼저 훑는 목록 한 줄. 본문은 out/articles/<id>.txt에 따로 둔다.
export interface IndexEntry extends Omit<
  Candidate,
  'content' | 'contentSource'
> {
  id: string
  chars: number
}

export interface CollectOutput {
  generatedAt: string
  candidates: IndexEntry[]
  reports: FetchReport[]
  droppedForExtraction: {title: string; url: string; reason: string}[]
}
