const TRACKING_PREFIXES = ['utm_', 'ref_']
const TRACKING_KEYS = new Set([
  'ref',
  'source',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
])

export function normalizeUrl(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  parsed.protocol = 'https:'
  parsed.hash = ''
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

  // 순회 중에 지우므로 키를 먼저 복사해 둔다.
  // oxlint-disable-next-line unicorn/no-useless-spread
  for (const key of [...parsed.searchParams.keys()]) {
    const lower = key.toLowerCase()
    if (
      TRACKING_PREFIXES.some((p) => lower.startsWith(p)) ||
      TRACKING_KEYS.has(lower)
    ) {
      parsed.searchParams.delete(key)
    }
  }
  if ([...parsed.searchParams.keys()].length === 0) parsed.search = ''

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }

  return parsed.toString()
}
