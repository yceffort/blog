import os from 'node:os'

export const dynamic = 'force-dynamic'

// SSR 부하를 흉내 내기 위해 요청마다 서버에서 목록을 만들어 렌더링한다.
// RESPONSE_DELAY_MS를 주면 in-flight 요청 드레인 실험(삶과 죽음 편)에 쓸 수 있다.
async function buildItems() {
  const delay = Number(process.env.RESPONSE_DELAY_MS || 0)
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay))
  }
  return Array.from({length: 500}, (_, i) => ({
    id: i,
    name: `item-${i}`,
    detail: `pod=${os.hostname()} ts=${Date.now()}`,
  }))
}

export default async function Page() {
  const items = await buildItems()
  return (
    <main>
      <h1>k8s-fe-lab ({os.hostname()})</h1>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {item.name} / {item.detail}
          </li>
        ))}
      </ul>
    </main>
  )
}
