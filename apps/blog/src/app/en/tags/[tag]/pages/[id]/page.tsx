import TagPostsView, {
  tagPostsMetadata,
  tagPostsStaticParams,
} from '@/components/tags/TagPostsView'

export async function generateMetadata(props: {
  params: Promise<{tag: string; id: string}>
}) {
  return tagPostsMetadata(await props.params, 'en')
}

export function generateStaticParams() {
  return tagPostsStaticParams('en')
}

export default async function Page(props: {
  params: Promise<{tag: string; id: string}>
}) {
  const {tag, id} = await props.params
  return <TagPostsView tag={tag} id={id} locale="en" />
}
