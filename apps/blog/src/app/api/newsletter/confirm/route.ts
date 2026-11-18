import {NextResponse} from 'next/server'

import {addSubscriber, readConfirmToken} from '@/utils/newsletter'

// 메일 보안 스캐너가 링크를 미리 열어도 구독되지 않도록, 확인은 페이지의 버튼이 보내는 POST로만 받는다
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: unknown
  } | null
  const email =
    typeof body?.token === 'string' ? readConfirmToken(body.token) : null
  if (!email) {
    return NextResponse.json({error: 'invalid token'}, {status: 400})
  }
  try {
    await addSubscriber(email)
    return NextResponse.json({ok: true})
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API/newsletter/confirm] Error:', error)
    return NextResponse.json({error: 'subscribe failed'}, {status: 502})
  }
}
