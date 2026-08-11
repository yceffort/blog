/**
 * 새 글/새 시리즈가 main에 추가되면 웹 푸시 구독자 전원에게 알림을 보낸다.
 *
 * 사용법: node apps/blog/scripts/notify-push.mjs <추가된 md 파일 경로...>
 * 필요 환경변수: KV_REST_API_URL, KV_REST_API_TOKEN, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
 */
import {readFile} from 'node:fs/promises'

import webpush from 'web-push'

const SITE_URL = 'https://yceffort.kr'
const SUBSCRIPTIONS_KEY = 'push:subscriptions'

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

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return {}
  }
  const fields = {}
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/)
    if (kv) {
      fields[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return fields
}

// posts/{y}/{m}/{slug}.md → 새 글, series/{slug}.md → 새 시리즈
async function toNotification(filePath) {
  const post = filePath.match(/posts\/(\d{4})\/(\d{2})\/([^/]+)\.md$/)
  const series = filePath.match(/series\/([^/]+)\.md$/)
  if (!post && !series) {
    return null
  }
  const fm = parseFrontmatter(await readFile(filePath, 'utf8'))
  if (fm.published === 'false') {
    return null
  }
  if (post) {
    return {
      title: '새 글이 올라왔어요',
      body: fm.title || post[3],
      url: `/${post[1]}/${post[2]}/${post[3]}`,
    }
  }
  return {
    title: '새 시리즈가 시작됐어요',
    body: fm.name || series[1],
    url: `/series/${series[1]}`,
  }
}

// 배포가 끝나기 전에 알림이 나가면 링크가 404가 되므로, 새 글 URL이
// 살아날 때까지 기다린다
async function waitForDeploy(url, timeoutMs = 10 * 60 * 1000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${SITE_URL}${url}`, {method: 'HEAD'})
      if (response.ok) {
        return true
      }
    } catch {
      // 재시도
    }
    await new Promise((resolve) => setTimeout(resolve, 20_000))
  }
  return false
}

const files = process.argv.slice(2).filter((f) => !f.endsWith('.en.md'))
const notifications = (
  await Promise.all(files.map((f) => toNotification(f)))
).filter(Boolean)

if (notifications.length === 0) {
  console.log('no notifications to send')
  process.exit(0)
}

const live = await waitForDeploy(notifications[0].url)
if (!live) {
  console.error(`deploy did not become live for ${notifications[0].url}`)
  process.exit(1)
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
