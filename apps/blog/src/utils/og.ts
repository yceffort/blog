export function buildOgImageUrl({
  title,
  description,
  tags,
  path,
  thumbnail,
  type,
  size,
}: {
  title: string
  description?: string
  tags?: string[]
  path?: string
  thumbnail?: string
  type?: string
  size?: string
}): string {
  const params = new URLSearchParams({title})
  if (description) {params.set('description', description)}
  if (tags?.length) {params.set('tags', tags.join(','))}
  if (path) {params.set('path', path)}
  if (thumbnail) {params.set('thumbnail', thumbnail)}
  if (type) {params.set('type', type)}
  if (size) {params.set('size', size)}
  return `/api/og?${params.toString()}`
}
