import {createHash} from 'node:crypto'
import {readdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import * as cacheNames from '../src/lib/offline/cacheNames.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const sha256 = (content) => createHash('sha256').update(content).digest('hex')

// The service worker repeats the app's cache names. If they drift, it cannot
// find the decks the app saved, and offline playback breaks without an error.
const serviceWorker = await readFile(path.join(root, 'public/sw.js'), 'utf8')
for (const [name, value] of Object.entries(cacheNames)) {
  if (!serviceWorker.includes(`const ${name} = '${value}'`)) {
    throw new Error(
      `public/sw.js ${name} does not match src/lib/offline/cacheNames.ts ('${value}')`,
    )
  }
}

const staticDir = path.join(root, '.next/static')
const files = (await readdir(staticDir, {recursive: true}))
  .filter((file) => /\.(?:js|css|woff2?|ttf|otf)$/.test(file))
  .toSorted()

// Include lazy chunks too: Mermaid loads diagram implementations on demand.
// These are shared application files, never the decks' HTML/RSC/data.
const assets = await Promise.all(
  files.map(async (file) => ({
    url: `/_next/static/${file.split(path.sep).join('/')}`,
    sha256: sha256(await readFile(path.join(staticDir, file))),
  })),
)
const shell = await readFile(path.join(root, '.next/server/app/offline.html'))
await writeFile(path.join(root, 'public/offline-shell.html'), shell)
assets.push({url: '/offline-shell.html', sha256: sha256(shell)})
for (const file of [
  'favicon/web-app-manifest-192x192.png',
  'favicon/web-app-manifest-512x512.png',
  'favicon/apple-touch-icon.png',
  'favicon/favicon.svg',
  'favicon/favicon.ico',
  'favicon/favicon-96x96.png',
]) {
  assets.push({
    url: `/${file}`,
    sha256: sha256(await readFile(path.join(root, 'public', file))),
  })
}
const revision = sha256(JSON.stringify(assets)).slice(0, 24)
await writeFile(
  path.join(root, 'public/offline-runtime.json'),
  JSON.stringify({revision, shell: '/offline-shell.html', assets}),
)
console.log(`Offline runtime: ${assets.length} files (${revision})`)
