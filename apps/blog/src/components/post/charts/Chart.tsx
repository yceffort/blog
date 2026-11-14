import 'server-only'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'

import ChartContent from './ChartContent'
import {parseChart} from './schema'

/** Chart metadata and the accessible data table are included in the initial HTML. */
export default async function Chart({src}: {src: string}) {
  if (!/^\/charts\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.json$/.test(src)) {
    throw new Error(`Invalid chart path: ${src}`)
  }
  const data = parseChart(
    JSON.parse(await readFile(join(process.cwd(), 'public', src), 'utf8')),
  )
  return <ChartContent key={src} src={src} data={data} />
}
