'use client'

import {useRouter, useSearchParams} from 'next/navigation'
import {useCallback, useEffect, useRef, useState} from 'react'

import {
  VirtuosoGrid,
  type GridStateSnapshot,
  type VirtuosoGridHandle,
} from 'react-virtuoso'

import type {Post} from '#src/type'

import PostCard from '#components/PostCard'
import {fetchPosts} from '#src/app/actions'
import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'

const DEFAULT_STORAGE_KEY = 'infinite-scroll-state'

function getStoredState(key: string): {
  posts: Post[]
  gridState: GridStateSnapshot
  uniqueKey?: string
} | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    const stored = sessionStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {}
  return null
}

function saveState(
  key: string,
  posts: Post[],
  gridState: GridStateSnapshot,
  uniqueKey: string,
) {
  try {
    sessionStorage.setItem(key, JSON.stringify({posts, gridState, uniqueKey}))
  } catch {}
}

export default function InfiniteScrollList({
  posts: initialPosts,
  storageKey = DEFAULT_STORAGE_KEY,
  uniqueKey,
}: {
  posts: Post[]
  storageKey?: string
  uniqueKey: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams
  const virtuosoRef = useRef<VirtuosoGridHandle>(null)
  const gridStateRef = useRef<GridStateSnapshot | undefined>(undefined)

  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const loadedPageRef = useRef(
    Math.ceil(posts.length / DEFAULT_NUMBER_OF_POSTS),
  )
  const loadingRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const initialGridStateRef = useRef<GridStateSnapshot | undefined>(undefined)

  useEffect(() => {
    const stored = getStoredState(storageKey)
    if (stored && stored.uniqueKey === uniqueKey) {
      setPosts(stored.posts)
      loadedPageRef.current = Math.ceil(
        stored.posts.length / DEFAULT_NUMBER_OF_POSTS,
      )
      initialGridStateRef.current = stored.gridState
    }

    setMounted(true)
  }, [storageKey, uniqueKey])

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (gridStateRef.current) {
        saveState(storageKey, posts, gridStateRef.current, uniqueKey)
      }
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('a') && gridStateRef.current) {
        saveState(storageKey, posts, gridStateRef.current, uniqueKey)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick)
    }
  }, [posts, storageKey, uniqueKey])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) {
      return
    }

    loadingRef.current = true
    const nextPage = loadedPageRef.current + 1
    loadedPageRef.current = nextPage
    setLoading(true)
    try {
      const newPosts = await fetchPosts(nextPage)

      if (newPosts.length === 0) {
        setHasMore(false)
      } else {
        setPosts((prev) => {
          const existingSlugs = new Set(prev.map((p) => p.fields.slug))
          const uniqueNewPosts = newPosts.filter(
            (p) => !existingSlugs.has(p.fields.slug),
          )
          return [...prev, ...uniqueNewPosts]
        })
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load more posts:', error)
      loadedPageRef.current = nextPage - 1
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore])

  return (
    <div className="divide-y divide-gray-200 px-4 dark:divide-gray-700">
      {!mounted ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div key={post.fields.slug} className="w-full py-2 px-2 pb-8">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      ) : (
        <VirtuosoGrid
          ref={virtuosoRef}
          useWindowScroll
          totalCount={posts.length}
          data={posts}
          endReached={loadMore}
          overscan={200}
          restoreStateFrom={initialGridStateRef.current}
          stateChanged={(state) => {
            gridStateRef.current = state
          }}
          itemContent={(index, post) => {
            return (
              <div className="py-2 px-2 pb-8">
                <PostCard post={post} />
              </div>
            )
          }}
          rangeChanged={({startIndex}) => {
            const page = Math.floor(startIndex / DEFAULT_NUMBER_OF_POSTS) + 1
            const currentParams = new URLSearchParams(searchParamsRef.current.toString())

            if (page > 1) {
              currentParams.set('page', page.toString())
            } else {
              currentParams.delete('page')
            }

            const newQuery = currentParams.toString()
            const newPath = newQuery ? `/?${newQuery}` : '/'

            // Use replace to update URL without adding to history stack for every scroll
            router.replace(newPath, {scroll: false})
          }}
          listClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          itemClassName="w-full"
          components={{
            Footer: () => {
              return loading ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 mb-8">
                  Loading more posts...
                </div>
              ) : null
            },
          }}
        />
      )}
    </div>
  )
}
