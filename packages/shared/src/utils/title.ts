const EM_PATTERN = /<em>([\s\S]*?)<\/em>/g

export function stripTitleEmphasis(title: string): string {
  return title.replace(EM_PATTERN, '$1')
}

export interface TitlePart {
  text: string
  emphasis: boolean
}

export function parseTitleEmphasis(title: string): TitlePart[] {
  if (!title.includes('<em>')) {
    const trimmed = title.trim()
    const firstSpace = trimmed.indexOf(' ')
    if (firstSpace === -1) {
      return [{text: trimmed, emphasis: true}]
    }
    return [
      {text: trimmed.slice(0, firstSpace), emphasis: true},
      {text: trimmed.slice(firstSpace), emphasis: false},
    ]
  }

  const parts: TitlePart[] = []
  let lastIndex = 0
  EM_PATTERN.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = EM_PATTERN.exec(title)) !== null) {
    if (match.index > lastIndex) {
      parts.push({text: title.slice(lastIndex, match.index), emphasis: false})
    }
    parts.push({text: match[1], emphasis: true})
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < title.length) {
    parts.push({text: title.slice(lastIndex), emphasis: false})
  }
  return parts
}
