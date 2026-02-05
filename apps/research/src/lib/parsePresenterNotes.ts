export function parsePresenterNotes(markdown: string): string[] {
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---/, '')
  const slides = withoutFrontmatter.split(/\n---\n/)
  const commentRegex = /<!--([\s\S]*?)-->/g
  const directiveRegex = /^\s*[\w_]+\s*:/

  return slides.map((slide) => {
    const notes: string[] = []
    let match

    while ((match = commentRegex.exec(slide)) !== null) {
      const content = match[1].trim()
      if (directiveRegex.test(content)) continue
      if (!content) continue
      notes.push(content)
    }

    return notes.join('\n\n')
  })
}
