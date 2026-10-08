import TagsIndexView, {tagsIndexMetadata} from '@/components/tags/TagsIndexView'

export const metadata = tagsIndexMetadata('en')

export default function Page() {
  return <TagsIndexView locale="en" />
}
