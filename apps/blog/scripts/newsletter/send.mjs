// 주간 메일을 Resend Broadcast로 보낸다. 기본은 지난주(월 ~ 일, KST)에 쓴 글을 구독자 세그먼트로 보낸다.
// node apps/blog/scripts/newsletter/send.mjs [--from YYYY-MM-DD --to YYYY-MM-DD] [--featured <slug>] [--segment <id>] [--draft]
// --segment는 테스트 세그먼트로 보낼 때, --draft는 보내지 않고 Resend에 초안만 만들 때 쓴다.
import fs from 'node:fs'

import {renderWeekly} from './render.mjs'

const FROM = 'yceffort <newsletter@mail.yceffort.kr>'

function env(name) {
  const value = process.env[name]
  if (!value) {
    console.error(`${name} is not set`)
    process.exit(1)
  }
  return value
}

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] || undefined : undefined
}

// 오늘(KST)이 속한 주의 바로 앞 월요일 ~ 일요일
function lastWeek(now = Date.now()) {
  const today = new Date(now + 9 * 3600e3)
  const monday = new Date(
    Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - ((today.getUTCDay() + 6) % 7) - 7,
    ),
  )
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return [monday, sunday].map((d) => d.toISOString().slice(0, 10))
}

async function resend(method, path, body) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    ...(body ? {body: JSON.stringify(body)} : {}),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      `Resend ${method} ${path} ${response.status}: ${JSON.stringify(data)}`,
    )
  }
  return data
}

const [defaultFrom, defaultTo] = lastWeek()
const from = arg('from') || defaultFrom
const to = arg('to') || defaultTo
const subscribers = env('NEWSLETTER_SEGMENT_ID')
const segment = arg('segment') || subscribers
const draft = process.argv.includes('--draft')

// 구독 칸에서 "해지하면 지운다"고 알렸다. Resend는 해지한 연락처를 남겨 두므로 매주 발송 전에 지운다.
// 글이 없는 주에도 지워야 하므로 렌더보다 먼저 한다
async function pruneUnsubscribed() {
  let removed = 0
  let after
  do {
    const query = `segment_id=${subscribers}&limit=100${after ? `&after=${after}` : ''}`
    const page = await resend('GET', `/contacts?${query}`)
    for (const contact of page.data) {
      if (contact.unsubscribed) {
        await resend('DELETE', `/contacts/${contact.id}`)
        removed++
      }
    }
    after = page.has_more ? page.data.at(-1)?.id : undefined
  } while (after)
  console.log(`pruned ${removed} unsubscribed contact(s)`)
}
if (!draft && !arg('segment')) {
  await pruneUnsubscribed()
}

const mail = renderWeekly({from, to, featured: arg('featured')})
if (!mail) {
  console.log(`${from} ~ ${to}: no posts, nothing to send`)
  process.exit(0)
}

// 구독자 발송은 주마다 한 번만. 크론이 다시 돌거나 수동 실행이 겹쳐도 같은 이름의 발송이 있으면 건너뛴다
const name = segment === subscribers ? mail.campaign : `${mail.campaign}-test`
if (segment === subscribers && !draft) {
  const {data} = await resend('GET', '/broadcasts')
  const done = data.find((b) => b.name === name && b.status !== 'draft')
  if (done) {
    console.log(`${name} already ${done.status} (${done.id}), skipping`)
    process.exit(0)
  }
}

const {id} = await resend('POST', '/broadcasts', {
  segment_id: segment,
  from: FROM,
  reply_to: env('NEWSLETTER_REPLY_TO'),
  subject: mail.subject,
  html: mail.html,
  text: mail.text,
  name,
  send: !draft,
})

const summary = [
  `${draft ? 'Drafted' : 'Sent'} ${name} (${id}) to segment ${segment === subscribers ? 'subscribers' : segment}`,
  `Subject: ${mail.subject}`,
  ...mail.posts.map((p) => `- ${p.day} ${p.slug}`),
].join('\n')
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
}
