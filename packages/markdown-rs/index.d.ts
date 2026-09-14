import type {Root} from 'hast'

/**
 * 마크다운 본문(frontmatter 제외)을 hast 트리로 바꾼다.
 * 코드 하이라이트, 수식, 이미지 크기는 호출한 쪽에서 rehype 플러그인으로 이어 붙인다.
 */
export function renderMarkdown(body: string): Root
