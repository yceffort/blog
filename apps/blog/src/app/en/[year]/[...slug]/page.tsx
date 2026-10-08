import {
  generatePostMetadata,
  generatePostStaticParams,
  PostDetail,
  type PostParams,
} from '@/components/post/PostDetail'

export async function generateMetadata(props: {params: Promise<PostParams>}) {
  return generatePostMetadata(await props.params, 'en')
}

export function generateStaticParams() {
  return generatePostStaticParams('en')
}

export default async function Page(props: {params: Promise<PostParams>}) {
  const {year, slug} = await props.params
  return <PostDetail year={year} slug={slug} locale="en" />
}
