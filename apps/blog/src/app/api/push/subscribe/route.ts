import {NextResponse} from 'next/server'

import {redis} from '@/utils/upstash'

const SUBSCRIPTIONS_KEY = 'push:subscriptions'

interface PushSubscriptionBody {
  endpoint?: string
  keys?: {p256dh?: string; auth?: string}
}

export async function POST(request: Request) {
  try {
    const subscription = (await request.json()) as PushSubscriptionBody
    const {endpoint, keys} = subscription
    if (!endpoint?.startsWith('https://') || !keys?.p256dh || !keys.auth) {
      return NextResponse.json({error: 'invalid subscription'}, {status: 400})
    }
    await redis([
      'HSET',
      SUBSCRIPTIONS_KEY,
      endpoint,
      JSON.stringify({endpoint, keys: {p256dh: keys.p256dh, auth: keys.auth}}),
    ])
    return NextResponse.json({ok: true})
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API/push/subscribe] Error:', error)
    return NextResponse.json({error: 'subscribe failed'}, {status: 500})
  }
}

export async function DELETE(request: Request) {
  try {
    const {endpoint} = (await request.json()) as {endpoint?: string}
    if (!endpoint) {
      return NextResponse.json({error: 'endpoint required'}, {status: 400})
    }
    await redis(['HDEL', SUBSCRIPTIONS_KEY, endpoint])
    return NextResponse.json({ok: true})
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API/push/subscribe] Error:', error)
    return NextResponse.json({error: 'unsubscribe failed'}, {status: 500})
  }
}
