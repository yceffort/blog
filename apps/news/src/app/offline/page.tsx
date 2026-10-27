import type {Metadata} from 'next'

export const metadata: Metadata = {
  title: '오프라인',
}

export default function Offline() {
  return (
    <p>
      오프라인이라 이 페이지를 불러오지 못했습니다.{' '}
      {/* oxlint-disable-next-line next/no-html-link-for-pages -- 오프라인 폴백에서는 라우터 없이 전체 리로드가 필요하다 */}
      <a href="/">마지막으로 받아 둔 최신 호 보기</a>
    </p>
  )
}
