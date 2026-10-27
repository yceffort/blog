import {mkdir, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

import {extractAll} from './extract'
import {withOrigin} from './origin'
import {filterUnseen, loadSeen, pruneSeen, recordSeen, saveSeen} from './seen'
import {filterRecent, shortlist} from './shortlist'
import {fetchHackerNews} from './sources/hackernews'
import {fetchAllRss} from './sources/rss'
import {fetchTrending} from './sources/trending'
import type {CollectOutput} from './types'

const SEEN_PATH = fileURLToPath(
  new URL('../state/seen-urls.json', import.meta.url),
)
const OUT_DIR = fileURLToPath(new URL('../out/', import.meta.url))
const OUT_PATH = `${OUT_DIR}candidates.json`

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')
  const now = new Date()

  const [rss, hn, trending] = await Promise.all([
    fetchAllRss(),
    fetchHackerNews(),
    fetchTrending(),
  ])

  const reports = [...rss.reports, ...hn.reports, ...trending.reports]
  const raw = [...rss.articles, ...hn.articles, ...trending.articles]
  const failed = reports.filter((r) => !r.ok)
  console.log(`수집 ${raw.length}건, 실패한 소스 ${failed.length}개`)
  for (const f of failed) console.log(`  실패: ${f.source} (${f.error})`)

  const seen = pruneSeen(await loadSeen(SEEN_PATH), now)
  const recent = filterRecent(raw, now)
  const fresh = filterUnseen(recent, seen)
  console.log(
    `최근 ${recent.length}건 → 중복 제거 후 ${fresh.length}건 (기억 ${Object.keys(seen).length}개)`,
  )

  const picked = shortlist(fresh)
  console.log(`1차 압축 후 ${picked.length}건, 본문 추출 시작`)

  const {candidates: extracted, dropped} = await extractAll(picked)
  const candidates = extracted.map(withOrigin)
  console.log(`본문 확보 ${candidates.length}건, 추출 실패 ${dropped.length}건`)

  const output: CollectOutput = {
    generatedAt: now.toISOString(),
    candidates,
    reports,
    droppedForExtraction: dropped,
  }
  await mkdir(OUT_DIR, {recursive: true})
  await writeFile(OUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(`${OUT_PATH} 작성 완료`)

  if (dryRun) {
    console.log('dry-run이므로 seen-urls.json을 갱신하지 않는다')
    return
  }
  await saveSeen(
    SEEN_PATH,
    recordSeen(
      seen,
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
