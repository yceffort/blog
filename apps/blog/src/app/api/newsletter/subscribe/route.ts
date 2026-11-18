import {redis} from '@yceffort/shared/server'
import {NextResponse} from 'next/server'

import {SiteConfig} from '@/config'
import {
  createConfirmToken,
  hashEmail,
  isEmail,
  sendConfirmMail,
} from '@/utils/newsletter'

// 아무 주소로나 확인 메일을 보내는 공개 엔드포인트라 메일 폭탄 통로가 되지 않게 막는다.
// IP당 1시간 10회, 같은 주소는 10분에 1통. 주소 제한에 걸려도 같은 응답을 줘서 구독 여부를 드러내지 않는다
async function limit(ip: string, email: string) {
  try {
    const ipKey = `newsletter:ip:${ip}`
    const hits = Number(await redis(['INCR', ipKey]))
    if (hits === 1) {
      await redis(['EXPIRE', ipKey, 3600])
    }
    if (hits > 10) {
      return 'ip'
    }
    const fresh = await redis([
      'SET',
      `newsletter:email:${hashEmail(email)}`,
      '1',
      'NX',
      'EX',
      600,
    ])
    return fresh === 'OK' ? 'ok' : 'email'
  } catch (error) {
    // Redis가 안 되면 구독을 막지 않는다. 로컬 개발 환경의 KV 토큰은 401이다
    // eslint-disable-next-line no-console
    console.error('[API/newsletter/subscribe] rate limit unavailable:', error)
    return 'ok'
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown
    website?: unknown
  } | null
  const email =
    typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!isEmail(email)) {
    return NextResponse.json({error: 'invalid email'}, {status: 400})
  }
  // 사람에게는 보이지 않는 칸. 채워져 있으면 봇이라 보낸 척만 한다
  if (body?.website) {
    return NextResponse.json({ok: true})
  }
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const verdict = await limit(ip, email)
  if (verdict === 'ip') {
    return NextResponse.json({error: 'too many requests'}, {status: 429})
  }
  if (verdict === 'email') {
    return NextResponse.json({ok: true})
  }
  try {
    const token = createConfirmToken(email)
    await sendConfirmMail(
      email,
      `${SiteConfig.url}/newsletter/confirm?token=${token}`,
    )
    return NextResponse.json({ok: true})
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API/newsletter/subscribe] Error:', error)
    return NextResponse.json({error: 'send failed'}, {status: 502})
  }
}
