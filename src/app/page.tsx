import InfiniteScrollList from '#components/InfiniteScrollList'
import {DEFAULT_NUMBER_OF_POSTS} from '#src/constants'
import {getAllPosts} from '#utils/Post'

export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const allPosts = await getAllPosts()

  const initialPage = searchParams.page
    ? parseInt(
        Array.isArray(searchParams.page)
          ? searchParams.page[0]
          : searchParams.page,
      )
    : 1

  // Calculate how many posts to show initially based on the page number
  // If page=2, we show posts for page 1 AND 2 so the user can scroll up if needed?
  // Or just show 1..N?
  // The user wants "redirect to that page area".
  // If we load 1..N, we can scroll to N.
  const endIndex = initialPage * DEFAULT_NUMBER_OF_POSTS

  // Strip body to reduce payload size
  const posts = allPosts.slice(0, endIndex).map((post) => ({
    ...post,
    body: '',
  }))

  return <InfiniteScrollList posts={posts} initialPage={initialPage} />
}
