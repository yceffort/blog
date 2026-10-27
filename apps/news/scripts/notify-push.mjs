/**
 * 새 일간/주간 호가 main에 추가되면 news 웹 푸시 구독자 전원에게 알림을 보낸다.
 *
 * 사용법: node apps/news/scripts/notify-push.mjs <추가된 호 파일 경로...>
 * 필요 환경변수: KV_REST_API_URL, KV_REST_API_TOKEN, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */
import {readFile} from 'node:fs/promises'

import webpush from 'web-push'

// 블로그 구독자(push:subscriptions)와 같은 Redis를 쓰므로 키를 나눈다
const SUBSCRIPTIONS_KEY = 'news:push:subscriptions'
// 알림을 눌러 들어온 세션을 GA4에서 Direct와 가르기 위한 꼬리표
const PUSH_UTM = 'utm_source=push&utm_medium=notification'

const {
  KV_REST_API_URL,
  KV_REST_API_TOKEN,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
} = process.env

if (
  !KV_REST_API_URL ||
  !KV_REST_API_TOKEN ||
  !VAPID_PUBLIC_KEY ||
  !VAPID_PRIVATE_KEY
) {
  console.error('missing required env vars')
  process.exit(1)
}

webpush.setVapidDetails(
  `mailto:root@yceffort.kr`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
)

async function redis(command) {
  const response = await fetch(KV_REST_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  if (!response.ok) {
    throw new Error(`redis request failed: ${response.status}`)
  }
  const {result} = await response.json()
  return result
}

const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Asia/Seoul'}).format(
  new Date(),
)

// content/daily/{date}.md → 일간 호, content/weekly/{week}.md → 주간 호
async function toNotification(filePath) {
  const match = filePath.match(/content\/(daily|weekly)\/([^/]+)\.md$/)
  if (!match) {
    return null
  }
  const [, kind, slug] = match
  const markdown = await readFile(filePath, 'utf8')
  // 지난 날짜를 소급해 만든 호는 새 소식이 아니므로 알리지 않는다
  if (markdown.match(/^date:\s*'?([\d-]+)'?$/m)?.[1] !== today) {
    return null
  }
  const url = `/${kind}/${slug}?${PUSH_UTM}`
  if (kind === 'daily') {
    return {
      title: '오늘 호가 나왔어요',
      // "오늘 하나만 본다면"의 제목. 목록에서도 이 한 줄로 호를 대표한다
      body: markdown.match(/^### (.+)$/m)?.[1]?.trim() || slug,
      url,
    }
  }
  const count = markdown.match(/^count:\s*(\d+)$/m)?.[1]
  return {
    title: '주간 호가 나왔어요',
    body: count ? `이번 주에 실은 글 ${count}편을 정리했습니다` : slug,
    url,
  }
}

const notifications = (
  await Promise.all(process.argv.slice(2).map((f) => toNotification(f)))
).filter(Boolean)

if (notifications.length === 0) {
  console.log('no notifications to send')
  process.exit(0)
}

const subscriptions = (await redis(['HVALS', SUBSCRIPTIONS_KEY])) || []
console.log(
  `sending ${notifications.length} notification(s) to ${subscriptions.length} subscriber(s)`,
)

let sent = 0
let removed = 0
for (const notification of notifications) {
  const payload = JSON.stringify(notification)
  await Promise.all(
    subscriptions.map(async (raw) => {
      const subscription = JSON.parse(raw)
      try {
        await webpush.sendNotification(subscription, payload)
        sent += 1
      } catch (error) {
        // 만료되거나 해지된 구독은 정리한다
        if (error.statusCode === 404 || error.statusCode === 410) {
          await redis(['HDEL', SUBSCRIPTIONS_KEY, subscription.endpoint])
          removed += 1
        } else {
          console.error(`send failed (${error.statusCode}): ${error.message}`)
        }
      }
    }),
  )
}

console.log(`done: ${sent} sent, ${removed} expired subscriptions removed`)
