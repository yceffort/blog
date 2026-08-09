import type {Metadata} from 'next'

export const metadata: Metadata = {
  title: 'Offline - yceffort',
}

export default function OfflinePage() {
  return (
    <div className="page-view">
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-6 text-gray-400 dark:text-gray-500"
        >
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
        </svg>
        <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          오프라인 상태입니다
        </h1>
        <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
          인터넷 연결이 끊어졌습니다. 이전에 방문한 페이지는 오프라인에서도 읽을
          수 있습니다.
        </p>
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- 오프라인 폴백에서는 라우터 없이 전체 리로드가 필요하다 */}
        <a
          href="/"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  )
}
