import PostsPageView, {
  postsPageMetadata,
  postsPageStaticParams,
} from '@/components/post/PostsPageView'

export async function generateMetadata(props: {params: Promise<{id: string}>}) {
  const {id} = await props.params
  return postsPageMetadata(id, 'ko')
}

export function generateStaticParams() {
  return postsPageStaticParams('ko')
}

export default async function Page(props: {params: Promise<{id: string}>}) {
  const {id} = await props.params
  return <PostsPageView id={id} locale="ko" />
}
