'use client'

import {lightFormat} from 'date-fns'
import {useSyncExternalStore} from 'react'

import {toInstant} from '@/utils/postDate'

const subscribe = () => () => {}

/** 서버는 작성 기준(KST) 날짜를 그리고, 하이드레이션 뒤 독자의 시간대 날짜로 바꾼다 */
export default function PostDate({
  value,
  pattern = 'yyyy-MM-dd',
}: {
  value: string
  pattern?: string
}) {
  const instant = toInstant(value)
  const date = useSyncExternalStore(
    subscribe,
    () => lightFormat(instant, pattern),
    // 오프셋 없는 값을 로컬로 읽고 로컬로 쓰면 적힌 벽시계 그대로 나온다
    () => lightFormat(new Date(value), pattern),
  )
  return <time dateTime={instant.toISOString()}>{date}</time>
}
