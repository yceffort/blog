export default function SubscribeCta({lang = 'ko'}: {lang?: 'ko' | 'en'}) {
  const isKo = lang === 'ko'
  return (
    <aside className="post-subscribe">
      <p>
        {isKo
          ? '새 글을 놓치고 싶지 않으시다면 RSS로 구독해 주세요.'
          : 'Enjoyed this post? Subscribe via RSS to get new posts.'}
      </p>
      <a
        href={isKo ? '/feed.xml' : '/en/feed.xml'}
        className="post-subscribe-link"
      >
        {isKo ? 'RSS 구독 →' : 'Subscribe via RSS →'}
      </a>
    </aside>
  )
}
