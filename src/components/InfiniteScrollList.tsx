'use client'

import {useRouter, useSearchParams} from 'next/navigation'
import {useCallback, useRef, useState} from 'react'

import {VirtuosoGrid, type VirtuosoGridHandle} from 'react-virtuoso'

import type {Post} from '#src/type'

import PostCard from '#components/PostCard'
import {fetchPosts} from '#src/app/actions'
import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'

export default function InfiniteScrollList({
  posts: initialPosts,
}: {
  posts: Post[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const virtuosoRef = useRef<VirtuosoGridHandle>(null)

  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  // Track the highest page loaded to prevent duplicate fetches
  const loadedPageRef = useRef(1)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) {
      return
    }

    setLoading(true)
    try {
      const nextPage = loadedPageRef.current + 1
      const newPosts = await fetchPosts(nextPage)

      if (newPosts.length === 0) {
        setHasMore(false)
      } else {
        setPosts((prev) => [...prev, ...newPosts])
        loadedPageRef.current = nextPage
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load more posts:', error)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore])

  return (
    <div className="divide-y divide-gray-200 px-4 dark:divide-gray-700">
      <VirtuosoGrid
        ref={virtuosoRef}
        useWindowScroll
        totalCount={posts.length}
        data={posts}
        endReached={loadMore}
        overscan={200}
        itemContent={(index, post) => {
          return (
            <div className="py-2 px-2 pb-8">
              <PostCard post={post} />
            </div>
          )
        }}
        rangeChanged={({startIndex}) => {
          const page = Math.floor(startIndex / DEFAULT_NUMBER_OF_POSTS) + 1
          const currentParams = new URLSearchParams(searchParams.toString())

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
    </div>
  )
}
