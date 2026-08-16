interface LiveDemoProps {
  /** public/ 아래에 둔 자급자족 HTML 데모 경로 (예: /demos/2026/08/banner-motion.html) */
  src: string
  title: string
  height?: number
}

/**
 * 본문 안에서 바로 돌아가는 HTML 데모. public/demos/ 아래의 자급자족 HTML을
 * sandbox iframe으로 렌더링한다.
 */
export default function LiveDemo({src, title, height = 480}: LiveDemoProps) {
  return (
    <figure className="my-6">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        sandbox="allow-scripts"
        style={{height}}
        className="w-full rounded-lg border border-gray-200 bg-white dark:border-gray-700"
      />
      <figcaption className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        {title} ·{' '}
        <a href={src} target="_blank" rel="noreferrer">
          새 탭에서 열기 ↗
        </a>
      </figcaption>
    </figure>
  )
}
