import type {Post} from '@/type'

export function seriesNeighbors(seriesPosts: Post[], currentSlug: string) {
  const currentIndex = seriesPosts.findIndex(
    (post) => post.fields.slug === currentSlug,
  )
  return {
    currentIndex,
    prevPost: currentIndex > 0 ? seriesPosts[currentIndex - 1] : null,
    nextPost:
      currentIndex < seriesPosts.length - 1
        ? seriesPosts[currentIndex + 1]
        : null,
  }
}
