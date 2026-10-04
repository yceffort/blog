/**
 * frontmatter의 date, updated는 KST 벽시계로 적는다. Post.ts가 오프셋 없이
 * 'yyyy-MM-ddTHH:mm:ss'로 정규화하므로 +09:00을 붙여야 실제 시점이 된다.
 * 오프셋 없이 new Date()에 넘기면 실행 환경 시간대(Vercel은 UTC)로 읽혀 9시간 어긋난다.
 */
export function toInstant(value: string) {
  return new Date(`${value}+09:00`)
}
