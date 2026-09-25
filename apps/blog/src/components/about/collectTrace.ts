// 방문자 브라우저의 Performance Timeline에서 이 탭의 로딩 기록을 모은다.
// 어디로도 전송하지 않고 히어로 그래픽에만 쓴다.

export type BarKind = 'document' | 'script' | 'css' | 'font' | 'image' | 'other'

export type PhaseKey =
  | 'stalled'
  | 'dns'
  | 'connect'
  | 'tls'
  | 'ttfb'
  | 'download'

export interface Phase {
  key: PhaseKey
  ms: number
}

export interface Bar {
  url: string
  label: string
  kind: BarKind
  start: number
  end: number
  bytes: number
  // 이 그래픽을 그리는 코드가 든 청크
  self: boolean
  // 다른 출처가 Timing-Allow-Origin을 주지 않으면 빈 배열
  phases: Phase[]
  // 0이면 네트워크를 타지 않았다(HTTP 캐시 또는 서비스 워커), 다른 출처면 크기 자체를 모른다
  transfer: number
  encoded: number
  decoded: number
  protocol: string
  initiator: string
  blocking?: string
  cached: boolean
}

export interface Mark {
  label: 'FCP' | 'LCP'
  t: number
}

export interface Trace {
  bars: Bar[]
  longTasks: {start: number; end: number}[]
  marks: Mark[]
  // 그래픽의 시간 축 끝(ms)
  end: number
  totalBytes: number
  // 창 밖이라 그리지 않은 리소스 수
  hidden: number
}

const MAX_BARS = 64

function kindOf(entry: PerformanceResourceTiming): BarKind {
  const path = entry.name.split('?')[0]
  if (/\.(woff2?|ttf|otf)$/.test(path) || entry.initiatorType === 'font') {
    return 'font'
  }
  if (path.endsWith('.css') || entry.initiatorType === 'css') {
    return 'css'
  }
  if (/\.m?js$/.test(path) || entry.initiatorType === 'script') {
    return 'script'
  }
  if (
    /\.(png|jpe?g|webp|avif|gif|svg|ico)$/.test(path) ||
    entry.initiatorType === 'img'
  ) {
    return 'image'
  }
  return 'other'
}

function phasesOf(e: PerformanceResourceTiming): Phase[] {
  if (!e.requestStart) return []
  const dns = e.domainLookupEnd - e.domainLookupStart
  const tls =
    e.secureConnectionStart > 0 ? e.connectEnd - e.secureConnectionStart : 0
  const connect = e.connectEnd - e.connectStart - tls
  const stalled = Math.max(
    0,
    e.requestStart - e.startTime - dns - connect - tls,
  )
  return [
    {key: 'stalled', ms: stalled},
    {key: 'dns', ms: dns},
    {key: 'connect', ms: connect},
    {key: 'tls', ms: tls},
    {key: 'ttfb', ms: e.responseStart - e.requestStart},
    {key: 'download', ms: e.responseEnd - e.responseStart},
  ].map((p) => ({key: p.key as PhaseKey, ms: Math.max(0, p.ms)}))
}

function barOf(
  e: PerformanceResourceTiming,
  kind: BarKind,
  selfUrl?: string,
): Bar {
  return {
    url: e.name,
    label: labelOf(e.name),
    kind,
    start: e.startTime,
    end: Math.max(e.responseEnd, e.startTime + 1),
    bytes: e.transferSize || e.encodedBodySize || 0,
    self: e.name === selfUrl,
    phases: phasesOf(e),
    transfer: e.transferSize,
    encoded: e.encodedBodySize,
    decoded: e.decodedBodySize,
    protocol: e.nextHopProtocol,
    initiator: e.initiatorType,
    // Chromium만 제공한다
    blocking: (e as PerformanceResourceTiming & {renderBlockingStatus?: string})
      .renderBlockingStatus,
    cached: e.transferSize === 0 && e.decodedBodySize > 0,
  }
}

function labelOf(url: string) {
  try {
    const {pathname, host, searchParams} = new URL(url)
    const last = pathname.split('/').filter(Boolean).pop() ?? ''
    // 확장자가 없는 페이지 요청은 마지막 조각만으로는 무엇인지 알 수 없다
    const file = last.includes('.') ? last : pathname
    const name = searchParams.has('_rsc') ? `${file} (RSC)` : file
    return host === location.host ? name : `${host}/${name}`
  } catch {
    return url
  }
}

// 이 모듈이 실린 청크의 URL. V8과 JSC 모두 스택 프레임에 스크립트 URL을 남긴다.
export function currentChunkUrl() {
  const stack = new Error('chunk probe').stack ?? ''
  return stack.match(/(https?:\/\/[^\s()]+?\.js)(?::\d+){0,2}/)?.[1]
}

function observeOnce(type: string, timeout = 150) {
  return new Promise<PerformanceEntry[]>((resolve) => {
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) {
      resolve([])
      return
    }
    const entries: PerformanceEntry[] = []
    const observer = new PerformanceObserver((list) => {
      entries.push(...list.getEntries())
    })
    observer.observe({type, buffered: true})
    setTimeout(() => {
      observer.disconnect()
      resolve(entries)
    }, timeout)
  })
}

export async function collectTrace(selfUrl?: string): Promise<Trace> {
  const [lcpEntries, loafEntries, longTaskEntries] = await Promise.all([
    observeOnce('largest-contentful-paint'),
    observeOnce('long-animation-frame'),
    observeOnce('longtask'),
  ])

  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  const fcp = performance
    .getEntriesByType('paint')
    .find((e) => e.name === 'first-contentful-paint')?.startTime
  const lcp = lcpEntries.at(-1)?.startTime

  const marks: Mark[] = []
  if (fcp) marks.push({label: 'FCP', t: fcp})
  if (lcp) marks.push({label: 'LCP', t: lcp})

  // SPA로 들어오면 기록이 몇 분에 걸쳐 쌓인다. 첫 로딩 구간만 창으로 잡는다.
  const settled = Math.max(
    nav?.loadEventEnd || nav?.responseEnd || 0,
    lcp ?? 0,
    fcp ?? 0,
  )
  const windowStart = settled + 1200

  const resources = performance.getEntriesByType('resource')

  let bars: Bar[] = resources
    .filter((r) => r.startTime <= windowStart || r.name === selfUrl)
    .map((r) => barOf(r, kindOf(r), selfUrl))

  if (nav) {
    bars.unshift(barOf(nav, 'document'))
  }

  const total = bars.length
  if (bars.length > MAX_BARS) {
    const keep = new Set(
      bars
        .toSorted(
          (a, b) =>
            Number(b.self) - Number(a.self) ||
            b.end - b.start - (a.end - a.start),
        )
        .slice(0, MAX_BARS),
    )
    bars = bars.filter((b) => keep.has(b))
  }
  bars.sort((a, b) => a.start - b.start)

  const longTasks = (loafEntries.length ? loafEntries : longTaskEntries)
    .filter((e) => e.startTime <= windowStart)
    .map((e) => ({start: e.startTime, end: e.startTime + e.duration}))

  const end = Math.max(
    ...bars.filter((b) => !b.self || b.start <= windowStart).map((b) => b.end),
    ...marks.map((m) => m.t),
    1,
  )

  return {
    bars,
    longTasks,
    marks: marks.filter((m) => m.t <= end),
    end,
    totalBytes: bars.reduce((n, b) => n + b.bytes, 0),
    hidden: resources.length + (nav ? 1 : 0) - total + (total - bars.length),
  }
}
