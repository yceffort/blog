// Compare rendered HAST while allowing the Rust highlighter to use different
// token color classes. Code line wrappers and all non-token properties remain
// part of the comparison contract.
export function normalizeRendered(node) {
  if (Array.isArray(node)) {
    return node.map((child) => normalizeRendered(child))
  }
  if (!node || typeof node !== 'object') return node

  if (node.type === 'element' && node.tagName === 'math') {
    return normalizeMath(
      node,
      node.properties?.display === 'block' || node.properties?.display === true,
    )
  }

  if (
    node.type === 'element' &&
    node.tagName === 'span' &&
    (node.properties?.className?.includes?.('katex-display') ||
      node.properties?.className?.includes?.('katex'))
  ) {
    return normalizeMath(
      node,
      node.properties.className.includes('katex-display'),
    )
  }

  if (node.type !== 'element') {
    const out = {}
    for (const [key, value] of Object.entries(node)) {
      out[key] = normalizeRendered(value)
    }
    return out
  }

  const isCodeLine =
    node.tagName === 'span' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes('code-line')
  const properties = {...node.properties}

  if (isCodeLine) {
    return {
      ...node,
      properties,
      children: flattenCodeLine(node.children),
    }
  }

  return {
    ...node,
    properties,
    children: normalizeRendered(node.children),
  }
}

function flattenCodeLine(children) {
  let value = ''
  const visit = (child) => {
    if (child.type === 'text') {
      value += child.value
      return
    }
    if (child.type !== 'element' || child.tagName !== 'span') {
      throw new Error(
        `Unexpected node in code line: ${child.type}:${child.tagName ?? ''}`,
      )
    }
    for (const nested of child.children) visit(nested)
  }
  for (const child of children) visit(child)
  return value ? [{type: 'text', value}] : []
}

function normalizeMath(node, display) {
  const annotation = findAnnotation(node)
  if (!annotation) throw new Error('Math node is missing a TeX annotation')
  return {type: 'math', display, source: textContent(annotation)}
}

function findAnnotation(node) {
  if (node.type === 'element' && node.tagName === 'annotation') return node
  for (const child of node.children ?? []) {
    if (child.type === 'element') {
      const annotation = findAnnotation(child)
      if (annotation) return annotation
    }
  }
  return null
}

function textContent(node) {
  if (node.type === 'text') return node.value
  return (node.children ?? []).map(textContent).join('')
}
