import {NextResponse} from 'next/server'
import webpush from 'web-push'

import {withRedis} from '#utils/redis'

const HASH_KEY = 'push:subscriptions'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.PUSH_API_SECRET}`) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401})
  }

  const payload = await request.json()
  const payloadStr = JSON.stringify(payload)

  const result = await withRedis(async (client) => {
    const all = await client.hGetAll(HASH_KEY)
    const entries = Object.entries(all)
    let sent = 0
    let failed = 0
    const expired: string[] = []

    await Promise.allSettled(
      entries.map(async ([endpoint, subJson]) => {
        try {
          const subscription = JSON.parse(subJson)
          await webpush.sendNotification(subscription, payloadStr)
          sent++
        } catch (err: unknown) {
          failed++
          const statusCode = (err as {statusCode?: number}).statusCode
          if (statusCode === 404 || statusCode === 410) {
            expired.push(endpoint)
          }
        }
      }),
    )

    if (expired.length > 0) {
      await client.hDel(HASH_KEY, expired)
    }

    return {sent, failed, cleaned: expired.length, total: entries.length}
  })

  return NextResponse.json(result)
}
