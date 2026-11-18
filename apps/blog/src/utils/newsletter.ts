import {createHash, createHmac, timingSafeEqual} from 'node:crypto'

export const NEWSLETTER_FROM = 'yceffort <newsletter@mail.yceffort.kr>'
const TOKEN_TTL_MS = 48 * 60 * 60 * 1000

function env(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

export const isEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export const hashEmail = (email: string) =>
  createHash('sha256').update(email).digest('hex').slice(0, 32)

const sign = (payload: string) =>
  createHmac('sha256', env('NEWSLETTER_SECRET'))
    .update(payload)
    .digest('base64url')

// 확인 링크 토큰. 저장소 없이 서명 하나로 주소와 만료 시각을 묶는다
export function createConfirmToken(email: string, now = Date.now()) {
  const payload = `${Buffer.from(email).toString('base64url')}.${(now + TOKEN_TTL_MS).toString(36)}`
  return `${payload}.${sign(payload)}`
}

export function readConfirmToken(token: string, now = Date.now()) {
  const [address, expires, signature] = token.split('.')
  if (!address || !expires || !signature) {
    return null
  }
  const expected = Buffer.from(sign(`${address}.${expires}`))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }
  if (parseInt(expires, 36) < now) {
    return null
  }
  return Buffer.from(address, 'base64url').toString()
}

export async function resend(path: string, body: unknown) {
  const response = await fetch(`https://api.resend.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(
      `Resend ${path} ${response.status}: ${await response.text()}`,
    )
  }
}

// 이미 있는 주소도 같은 연락처로 받아 구독 해지를 풀고 세그먼트에 넣는다 (2026-11 Resend 응답으로 확인)
export const addSubscriber = (email: string) =>
  resend('/contacts', {
    email,
    unsubscribed: false,
    segments: [{id: env('NEWSLETTER_SEGMENT_ID')}],
  })

export function sendConfirmMail(email: string, link: string) {
  const SANS = `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', sans-serif`
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
@media (prefers-color-scheme:dark){.page{background:#09090c!important}.shell{background:#131318!important}.ink{color:#f3f3f6!important}.ink2{color:#b8b8c3!important}.btn{background:#a78bfa!important}.btn a{color:#09090c!important}}
</style>
</head>
<body class="page" style="margin:0;padding:0;background:#f2f2f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="page" bgcolor="#f2f2f5" style="background:#f2f2f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="shell" bgcolor="#ffffff" style="max-width:480px;background:#ffffff;border-radius:20px;">
<tr><td style="padding:28px 28px 30px;font-family:${SANS};">
  <p class="ink" style="margin:0;font-size:15px;line-height:20px;font-weight:800;color:#16161d;">yceffort</p>
  <h1 class="ink" style="margin:20px 0 0;font-size:22px;line-height:30px;font-weight:800;letter-spacing:-0.02em;color:#16161d;word-break:keep-all;">메일 구독을 확인해 주세요</h1>
  <p class="ink2" style="margin:10px 0 0;font-size:15px;line-height:24px;color:#4a4a55;word-break:keep-all;">아래 버튼을 누르면 매주 월요일 아침, 지난주에 쓴 글을 모아 보내 드립니다. 직접 신청하지 않으셨다면 이 메일은 무시하셔도 됩니다.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>
    <td class="btn" bgcolor="#6d28d9" style="border-radius:999px;background:#6d28d9;"><a href="${link}" style="display:inline-block;padding:11px 20px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;">구독 확인 &rarr;</a></td>
  </tr></table>
  <p class="ink2" style="margin:20px 0 0;font-size:13px;line-height:20px;color:#8b8b97;">링크는 48시간 동안 열립니다.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  const text = `yceffort 메일 구독을 확인해 주세요.\n\n아래 링크를 열고 버튼을 누르면 매주 월요일 아침, 지난주에 쓴 글을 모아 보내 드립니다. 직접 신청하지 않으셨다면 이 메일은 무시하셔도 됩니다.\n\n${link}\n\n링크는 48시간 동안 열립니다.`
  const replyTo = process.env.NEWSLETTER_REPLY_TO
  return resend('/emails', {
    from: NEWSLETTER_FROM,
    to: [email],
    subject: '[yceffort] 메일 구독을 확인해 주세요',
    html,
    text,
    ...(replyTo ? {reply_to: replyTo} : {}),
  })
}
