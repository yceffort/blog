import type {Root} from 'hast'

/**
 * 마크다운 본문(frontmatter 제외)을 hast 트리로 바꾼다.
 * 코드 하이라이트와 수식을 포함한다. path가 있으면 로컬 이미지 경로와 크기도 처리한다.
 */
export function renderMarkdown(body: string, path?: string): Root
