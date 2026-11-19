import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {POST} from './route'

const {redis} = vi.hoisted(() => ({
  redis: vi.fn<(command: (string | number)[]) => Promise<unknown>>(),
}))
vi.mock('@yceffort/shared/server', () => ({redis}))
vi.mock('@/config', () => ({SiteConfig: {url: 'https://example.test'}}))
vi.mock('@/utils/newsletter', () => import('../../../../utils/newsletter'))

const entries = new Map<string, string | number>()
const send = vi.fn<typeof fetch>()

const subscribe = () =>
  POST(
    new Request('https://example.test/api/newsletter/subscribe', {
      method: 'POST',
      headers: {'x-forwarded-for': '192.0.2.1'},
      body: JSON.stringify({email: 'reader@example.test'}),
    }),
  )

function addressKey() {
  const key = [...entries.keys()].find((entry) =>
    entry.startsWith('newsletter:email:'),
  )
  if (!key) throw new Error('Expected an address reservation')
  return key
}

beforeEach(() => {
  entries.clear()
  send.mockReset()
  vi.stubGlobal('fetch', send)
  vi.stubEnv('NEWSLETTER_SECRET', 'test-only')
  vi.stubEnv('RESEND_API_KEY', 'test-only')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  redis.mockReset()
  redis.mockImplementation(async ([cmd, arg1, value, evalKey, evalOwner]) => {
    const key = String(arg1)
    if (cmd === 'INCR') {
      const count = Number(entries.get(key) ?? 0) + 1
      entries.set(key, count)
      return count
    }
    if (cmd === 'EXPIRE') return 1
    if (cmd === 'SET') {
      if (entries.has(key)) return null
      entries.set(key, value)
      return 'OK'
    }
    if (cmd === 'EVAL') {
      const reservation = String(evalKey)
      return entries.get(reservation) === evalOwner &&
        entries.delete(reservation)
        ? 1
        : 0
    }
    throw new Error(`Unexpected Redis command: ${cmd}`)
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill
  })
  return {promise, resolve}
}

describe('newsletter subscription confirmation', () => {
  it('allows an immediate retry after Resend rejects the email', async () => {
    send.mockResolvedValueOnce(new Response(null, {status: 429}))
    send.mockResolvedValueOnce(new Response(null, {status: 200}))

    expect((await subscribe()).status).toBe(502)
    expect((await subscribe()).status).toBe(200)
    expect(send).toHaveBeenCalledTimes(2)
    expect(entries.get('newsletter:ip:192.0.2.1')).toBe(2)

    expect((await subscribe()).status).toBe(200)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('does not dispatch a second email while the first send is in flight', async () => {
    const pending = deferred<Response>()
    const started = deferred<void>()
    send.mockImplementationOnce(() => {
      started.resolve(undefined)
      return pending.promise
    })

    const first = subscribe()
    await started.promise
    try {
      expect((await subscribe()).status).toBe(200)
      expect(send).toHaveBeenCalledTimes(1)
    } finally {
      pending.resolve(new Response(null, {status: 200}))
      expect((await first).status).toBe(200)
    }
  })

  it('does not release a newer reservation after the original expires', async () => {
    send.mockImplementationOnce(async () => {
      entries.set(addressKey(), 'new-owner')
      return new Response(null, {status: 422})
    })

    expect((await subscribe()).status).toBe(502)
    expect(entries.get(addressKey())).toBe('new-owner')
    expect((await subscribe()).status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
  })

  it.each([408, 409, 503])(
    'keeps the reservation when HTTP %s leaves delivery uncertain',
    async (status) => {
      send.mockResolvedValueOnce(new Response(null, {status}))

      expect((await subscribe()).status).toBe(502)
      expect((await subscribe()).status).toBe(200)
      expect(send).toHaveBeenCalledTimes(1)
    },
  )

  it('keeps the reservation when no provider response is available', async () => {
    send.mockRejectedValueOnce(new TypeError('connection lost'))

    expect((await subscribe()).status).toBe(502)
    expect((await subscribe()).status).toBe(200)
    expect(send).toHaveBeenCalledTimes(1)
  })
})
