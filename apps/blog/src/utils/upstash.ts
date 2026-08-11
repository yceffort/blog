const REST_URL = process.env.KV_REST_API_URL
const REST_TOKEN = process.env.KV_REST_API_TOKEN

export async function redis(command: (string | number)[]): Promise<unknown> {
  if (!REST_URL || !REST_TOKEN) {
    throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN is not configured')
  }
  const response = await fetch(REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Redis request failed: ${response.status}`)
  }
  const data = (await response.json()) as {result: unknown}
  return data.result
}
