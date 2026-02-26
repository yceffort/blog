import {NextResponse} from 'next/server'

import {withRedis} from '#utils/redis'

const HASH_KEY = 'push:subscriptions'

export async function POST(request: Request) {
  const subscription = await request.json()
  const endpoint = subscription.endpoint as string

  if (!endpoint) {
    return NextResponse.json({error: 'Invalid subscription'}, {status: 400})
  }

  await withRedis((client) => client.hSet(HASH_KEY, endpoint, JSON.stringify(subscription)))

  return NextResponse.json({ok: true})
}

export async function DELETE(request: Request) {
  const {endpoint} = await request.json()

  if (!endpoint) {
    return NextResponse.json({error: 'Missing endpoint'}, {status: 400})
  }

  await withRedis((client) => client.hDel(HASH_KEY, endpoint))

  return NextResponse.json({ok: true})
}
