import {mkdir, rm, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

import {extractAll} from './extract'
import {withOrigin} from './origin'
import {filterRecent} from './recent'
import {
  filterUnseen,
  loadSeen,
  pruneSeen,
  recordSeen,
  saveSeen,
  seenAsOf,
} from './seen'
import {fetchHackerNews} from './sources/hackernews'
import {fetchAllRss} from './sources/rss'
import {fetchTrending} from './sources/trending'
import type {Candidate, CollectOutput, IndexEntry} from './types'

const SEEN_PATH = fileURLToPath(
  new URL('../state/seen-urls.json', import.meta.url),
)
const OUT_DIR = fileURLToPath(new URL('../out/', import.meta.url))
const INDEX_PATH = `${OUT_DIR}index.json`
const ARTICLES_DIR = `${OUT_DIR}articles/`
const DESCRIPTION_MAX_CHARS = 300

// --as-of YYYY-MM-DD 는 그날 09:00 KST에 돌았던 것처럼 수집한다. 지난 호를 소급해 만들 때 쓴다.
function parseAsOf(argv: string[]): Date | undefined {
  const i = argv.indexOf('--as-of')
  if (i === -1) return undefined
  const value = argv[i + 1] ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`--as-of는 YYYY-MM-DD 형식이어야 한다: ${value}`)
  }
  return new Date(`${value}T00:00:00Z`)
}

// 본문은 공백을 접은 한 줄이라 그대로 두면 Read 도구가 긴 줄을 자른다.
function wrap(text: string, width = 400): string {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines.join('\n')
}

function toEntry(c: Candidate, index: number): IndexEntry {
  const {content, contentSource: _, ...rest} = c
  return {
    ...rest,
    id: String(index + 1).padStart(3, '0'),
    description: rest.description.slice(0, DESCRIPTION_MAX_CHARS),
    chars: content.length,
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const asOf = parseAsOf(process.argv)
  const now = asOf ?? new Date()

  // GitHub Trending은 지난 날의 순위를 알 수 없어 소급 실행에서는 건너뛴다.
  const [rss, hn, trending] = await Promise.all([
    fetchAllRss(),
    fetchHackerNews(asOf),
    asOf ? {articles: [], reports: []} : fetchTrending(),
  ])

  const reports = [...rss.reports, ...hn.reports, ...trending.reports]
  const raw = [...rss.articles, ...hn.articles, ...trending.articles]
  const failed = reports.filter((r) => !r.ok)
  if (asOf) console.log(`소급 실행: ${now.toISOString()} 기준`)
  console.log(`수집 ${raw.length}건, 실패한 소스 ${failed.length}개`)
  for (const f of failed) console.log(`  실패: ${f.source} (${f.error})`)

  const stored = pruneSeen(await loadSeen(SEEN_PATH), new Date())
  const seen = asOf ? seenAsOf(stored, asOf) : stored
  const recent = filterRecent(raw, now)
  const fresh = filterUnseen(recent, seen)
  console.log(
    `최근 ${recent.length}건 → 중복 제거 후 ${fresh.length}건 (기억 ${Object.keys(seen).length}개), 본문 추출 시작`,
  )

  const {candidates: extracted, dropped} = await extractAll(fresh)
  const candidates = extracted
    .map(withOrigin)
    .toSorted(
      (a, b) =>
        (new Date(b.publishedAt).getTime() || 0) -
        (new Date(a.publishedAt).getTime() || 0),
    )
  console.log(`본문 확보 ${candidates.length}건, 추출 실패 ${dropped.length}건`)

  const entries = candidates.map(toEntry)
  const output: CollectOutput = {
    generatedAt: now.toISOString(),
    candidates: entries,
    reports,
    droppedForExtraction: dropped,
  }
  await rm(OUT_DIR, {recursive: true, force: true})
  await mkdir(ARTICLES_DIR, {recursive: true})
  await writeFile(INDEX_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  await Promise.all(
    candidates.map((c, i) =>
      writeFile(
        `${ARTICLES_DIR}${entries[i]!.id}.txt`,
        `${c.title}\n${c.url}\n\n${wrap(c.content)}\n`,
        'utf8',
      ),
    ),
  )
  console.log(`${INDEX_PATH}와 본문 ${candidates.length}개 작성 완료`)

  if (dryRun) {
    console.log('dry-run이므로 seen-urls.json을 갱신하지 않는다')
    return
  }
  await saveSeen(
    SEEN_PATH,
    recordSeen(
      stored,
      candidates.map((c) => c.url),
      now,
    ),
  )
  console.log('seen-urls.json 갱신 완료')
}

main().catch((err) => {
  console.error('수집 실패:', err)
  process.exit(1)
})
