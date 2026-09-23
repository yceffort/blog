import type {TransitionType} from '@/components/MarpSlides.constants'

export interface OfflineDeck {
  schemaVersion: 1
  slug: string
  title: string
  description?: string
  html: string[]
  css: string
  fonts: string[]
  notes: string[]
  post?: string
  transition?: TransitionType
}

export interface SavedDeck extends OfflineDeck {
  revision: string
  savedAt: number
  bytes: number
  assetCache: string
  assets: string[]
}

export interface RuntimeManifest {
  revision: string
  shell: string
  assets: {url: string; sha256: string}[]
}

export interface DownloadProgress {
  label: string
  completed: number
  total: number
}
