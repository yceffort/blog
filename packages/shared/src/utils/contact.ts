export function getContactHref(
  name: 'twitter' | 'github',
  contact: string,
): string {
  if (name === 'twitter') {
    return `https://twitter.com/${contact}`
  }
  return `https://github.com/${contact}`
}
