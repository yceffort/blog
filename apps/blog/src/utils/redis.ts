import {createClient, type RedisClientType} from 'redis'

export async function withRedis<T>(
  fn: (client: RedisClientType) => Promise<T>,
): Promise<T> {
  const client = createClient({url: process.env.REDIS_URL}) as RedisClientType
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.disconnect()
  }
}
