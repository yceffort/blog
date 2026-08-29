const fs = require('fs')
const html = fs.readFileSync('art.html', 'utf8')
function extract(caseInsensitive) {
  const found = new Set()
  const tagRe = caseInsensitive ? /<img\b[^>]*>/gi : /<img\b[^>]*>/g
  const attrRe = caseInsensitive
    ? /(?:src|srcset)="([^"]+)"/gi
    : /(?:src|srcset)="([^"]+)"/g
  let tag
  while ((tag = tagRe.exec(html))) {
    let m
    while ((m = attrRe.exec(tag[0]))) {
      for (const c of m[1].split(',')) {
        const u = c.trim().split(' ')[0].replaceAll('&amp;', '&')
        if (
          u.startsWith('/_next/image?') ||
          u.startsWith('/api/og/') ||
          u.startsWith('https://')
        )
          found.add(u)
      }
    }
    attrRe.lastIndex = 0
  }
  const bySource = new Map(),
    plain = []
  for (const u of found) {
    if (!u.startsWith('/_next/image?')) {
      plain.push(u)
      continue
    }
    const p = new URLSearchParams(u.slice('/_next/image?'.length))
    const src = p.get('url'),
      w = Number(p.get('w')) || 0
    const cur = bySource.get(src)
    if (!cur || Math.abs(w - 1080) < Math.abs(cur.width - 1080))
      bySource.set(src, {url: u, width: w})
  }
  return {
    all: [...plain, ...[...bySource.values()].map((v) => v.url)],
    widths: [...bySource.values()].map((v) => v.width),
  }
}
for (const ci of [false, true]) {
  const r = extract(ci)
  console.log(
    `${ci ? 'gi(수정 후)' : 'g (수정 전)'}: 총 ${r.all.length}개, /_next/image 너비 [${r.widths.join(' ')}]`,
  )
}
