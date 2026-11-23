// 주간 메일 HTML과 텍스트를 만든다.
// 미리보기: node apps/blog/scripts/newsletter/render.mjs --from 2026-11-09 --to 2026-11-15 [--featured <slug>] [--out <dir>]
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import frontMatter from 'front-matter'
import readingTime from 'reading-time'

const BLOG_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const SITE = 'https://yceffort.kr'

// packages/shared/src/og/palette.ts와 같은 값이어야 썸네일 바탕색과 카드가 이어진다. 다크 값은 메일 전용
const HUE = {
  warm: {
    accent: '#b45309',
    paper: '#fbf6ee',
    darkAccent: '#fbbf24',
    darkCard: '#221c14',
  },
  rose: {
    accent: '#be185d',
    paper: '#fbf1f4',
    darkAccent: '#f472b6',
    darkCard: '#25161d',
  },
  violet: {
    accent: '#6d28d9',
    paper: '#f4f1fb',
    darkAccent: '#a78bfa',
    darkCard: '#1d1828',
  },
  blue: {
    accent: '#1d4ed8',
    paper: '#eff4fb',
    darkAccent: '#60a5fa',
    darkCard: '#141c28',
  },
  cyan: {
    accent: '#0e7490',
    paper: '#edf7f8',
    darkAccent: '#22d3ee',
    darkCard: '#122125',
  },
  green: {
    accent: '#047857',
    paper: '#eef8f2',
    darkAccent: '#34d399',
    darkCard: '#13211b',
  },
  slate: {
    accent: '#334155',
    paper: '#f3f4f6',
    darkAccent: '#cbd5e1',
    darkCard: '#1b1d22',
  },
}
const HUES = Object.keys(HUE)
// palette.ts hueFor와 같은 규칙. art.hue가 없는 글의 썸네일 바탕색이 이 값으로 정해진다
const hueFor = (seed) => {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  return HUES[Math.abs(h) % HUES.length]
}

const C = {
  page: '#f2f2f5',
  shell: '#ffffff',
  ink: '#16161d',
  ink2: '#4a4a55',
  muted: '#8b8b97',
  line: '#e6e6ec',
  dPage: '#09090c',
  dShell: '#131318',
  dInk: '#f3f3f6',
  dInk2: '#b8b8c3',
  dMuted: '#7c7c88',
  dLine: '#25252d',
  brand: '#6d28d9',
  dBrand: '#a78bfa',
}
const SANS = `-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', Pretendard, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif`
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace`
const DOW = ['일', '월', '화', '수', '목', '금', '토']

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
const plainTitle = (t) => t.replace(/<\/?em>/g, '')
const titleHtml = (t, hue) =>
  t
    .split(/(<em>.*?<\/em>)/)
    .map((part) => {
      const m = /^<em>(.*)<\/em>$/.exec(part)
      return m
        ? `<span class="em-${hue}" style="color:${HUE[hue].accent};">${esc(m[1])}</span>`
        : esc(part)
    })
    .join('')

const md = (d) => `${Number(d.slice(5, 7))}.${d.slice(8, 10)}`
const dow = (d) => DOW[new Date(`${d}T00:00:00Z`).getUTCDay()]
const label = (p) =>
  (p.tags.includes('essay') ? 'essay' : p.tags[0] || 'post').toUpperCase()

function isoWeek(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3)
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  return (
    1 +
    Math.round(
      ((d - firstThu) / 864e5 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7,
    )
  )
}

// apps/blog/src/utils/Post.ts resolveThumbnail과 같은 우선순위: 생성 일러스트(webp), 실사(png), 코드 아트
// 메일에는 /newsletter/thumb 라우트가 줄인 PNG(일러스트, 코드 아트)나 JPEG(실사)를 쓴다
function emailThumbnail(slug, art) {
  const ext = ['webp', 'png'].find((e) =>
    fs.existsSync(path.join(BLOG_DIR, 'public/thumbnails', `${slug}.${e}`)),
  )
  if (!ext && !art) return undefined
  return `${SITE}/newsletter/thumb/${slug}.${ext === 'png' ? 'jpg' : 'png'}`
}

function collectPosts(from, to) {
  const months = new Set()
  for (
    let d = new Date(`${from}T00:00:00Z`);
    d <= new Date(`${to}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    months.add(d.toISOString().slice(0, 7).replace('-', '/'))
  }
  const posts = []
  for (const ym of months) {
    const dir = path.join(BLOG_DIR, 'posts', ym)
    if (!fs.existsSync(dir)) continue
    for (const file of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(file) || /\.en\.mdx?$/.test(file)) continue
      const {attributes: fm, body} = frontMatter(
        fs.readFileSync(path.join(dir, file), 'utf8'),
      )
      // js-yaml은 시간대 없는 date를 UTC로 읽으므로 ISO 문자열 앞 10자가 적힌 날짜 그대로다
      const date = new Date(fm.date).toISOString()
      const day = date.slice(0, 10)
      if (fm.published !== true || day < from || day > to) continue
      // 책 판매 알림처럼 광고성 정보로 볼 수 있는 글은 주간 메일에 싣지 않는다 (정보통신망법 제50조)
      if (fm.promotion === true) {
        console.log(`skip promotion: ${ym}/${file}`)
        continue
      }
      const slug = `${ym}/${file.replace(/\.mdx?$/, '')}`
      const hue = fm.art?.hue && HUE[fm.art.hue] ? fm.art.hue : hueFor(slug)
      posts.push({
        slug,
        date,
        day,
        hue,
        title: fm.title,
        description: fm.description,
        tags: (fm.tags || []).map((t) => t.trim()),
        series: fm.series,
        seriesOrder: fm.seriesOrder,
        thumbnail: emailThumbnail(slug, fm.art),
        minutes: Math.max(
          1,
          Math.ceil(readingTime(body, {wordsPerMinute: 250}).minutes),
        ),
      })
    }
  }
  return posts.toSorted((a, b) => b.date.localeCompare(a.date))
}

export function renderWeekly({from, to, featured: featuredSlug}) {
  const posts = collectPosts(from, to)
  if (!posts.length) return null

  const week = isoWeek(from)
  const campaign = `weekly-${from.slice(0, 4)}-w${week}`
  const utm = `utm_source=newsletter&utm_medium=email&utm_campaign=${campaign}`
  const plainUrl = (p) => `${SITE}/${p.slug}?${utm}`
  const url = (p) => esc(plainUrl(p))
  const home = esc(`${SITE}/?${utm}`)
  const featured =
    posts.find((p) => p.slug.endsWith(`/${featuredSlug}`)) || posts[0]
  const rest = posts.filter((p) => p !== featured)

  const subject = `[yceffort] ${plainTitle(featured.title)}${rest.length ? ` 외 ${rest.length}편` : ''}`
  const preheader = posts.map((p) => plainTitle(p.title)).join(' / ')

  const metaLine = (p, gap) =>
    `<p class="em-${p.hue}" style="margin:0 0 ${gap}px;font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:0.12em;color:${HUE[p.hue].accent};text-transform:uppercase;">` +
    `&#9670;&nbsp;${esc(label(p))}<span class="muted" style="color:${C.muted};">&nbsp;&nbsp;&nbsp;${md(p.day)} ${dow(p.day)}&nbsp;&nbsp;&nbsp;${p.minutes}분</span></p>`

  const series = (p) =>
    p.series
      ? `<p class="ink2" style="margin:8px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.ink2};word-break:keep-all;">시리즈 <span class="ink" style="color:${C.ink};font-weight:600;">${esc(p.series)}</span> ${esc(p.seriesOrder)}편</p>`
      : ''

  // 대표 그림은 썸네일 바탕색 칸 가운데에 작게 둔다. 바탕이 이어져서 칸 전체가 한 장의 그림처럼 보인다
  const featuredImage = featured.thumbnail
    ? `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td align="center" bgcolor="${HUE[featured.hue].paper}" style="background:${HUE[featured.hue].paper};border-radius:16px;">
      <a href="${url(featured)}" style="display:block;text-decoration:none;"><img src="${featured.thumbnail}" width="340" height="179" alt="" style="display:block;width:100%;max-width:340px;height:auto;border:0;border-radius:16px;"></a>
    </td>
  </tr></table>
  <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>`
    : ''

  const featuredHtml = `
<tr><td class="px" style="padding:4px 32px 8px;">${featuredImage}
  ${metaLine(featured, 8)}
  <h2 class="ink feat-title" style="margin:0;font-family:${SANS};font-size:21px;line-height:29px;font-weight:800;letter-spacing:-0.02em;color:${C.ink};word-break:keep-all;"><a href="${url(featured)}" class="ink" style="color:${C.ink};text-decoration:none;">${titleHtml(featured.title, featured.hue)}</a></h2>
  <p class="ink2" style="margin:6px 0 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.ink2};word-break:keep-all;">${esc(featured.description)}</p>
  ${series(featured)}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
    <tr><td class="btn-${featured.hue}" bgcolor="${HUE[featured.hue].accent}" style="border-radius:999px;background:${HUE[featured.hue].accent};">
      <a class="btn-txt" href="${url(featured)}" style="display:inline-block;padding:9px 16px;font-family:${SANS};font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">글 읽기 &rarr;</a>
    </td></tr>
  </table>
</td></tr>`

  const rowHtml = (p) => `
<tr><td class="px" style="padding:0 32px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="card-${p.hue}" bgcolor="${HUE[p.hue].paper}" style="background:${HUE[p.hue].paper};border-radius:14px;">
    <tr>
      <td valign="top" style="padding:14px 12px 14px 16px;">
        ${metaLine(p, 6)}
        <h3 class="ink row-title" style="margin:0;font-family:${SANS};font-size:16px;line-height:24px;font-weight:700;letter-spacing:-0.01em;color:${C.ink};word-break:keep-all;"><a href="${url(p)}" class="ink" style="color:${C.ink};text-decoration:none;">${titleHtml(p.title, p.hue)}</a></h3>
        <p class="ink2" style="margin:4px 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${C.ink2};word-break:keep-all;">${esc(p.description)}</p>
        ${series(p)}
      </td>
      ${p.thumbnail ? `<td class="row-thumb" width="128" valign="middle" style="width:128px;padding:10px 12px 10px 0;"><a href="${url(p)}" style="display:block;"><img src="${p.thumbnail}" width="128" height="67" alt="" style="display:block;width:128px;height:auto;border:0;border-radius:10px;"></a></td>` : ''}
    </tr>
  </table>
</td></tr>`

  const darkCss = HUES.map(
    (k) =>
      `.em-${k}{color:${HUE[k].darkAccent}!important}.card-${k}{background:${HUE[k].darkCard}!important}.btn-${k}{background:${HUE[k].darkAccent}!important}`,
  ).join('')
  const ogscCss = HUES.map(
    (k) =>
      `[data-ogsc] .em-${k}{color:${HUE[k].darkAccent}!important}[data-ogsb] .card-${k}{background:${HUE[k].darkCard}!important}`,
  ).join('')

  const html = `<!doctype html>
<html lang="ko" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>td,h1,h2,h3,p,a,span,div{font-family:'Malgun Gothic',Arial,sans-serif!important}</style><![endif]-->
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
img{-ms-interpolation-mode:bicubic}
a{text-decoration:none}
@media (max-width:620px){
.outer{padding:0!important}
.shell{border-radius:0!important}
.px{padding-left:20px!important;padding-right:20px!important}
.hero-title{font-size:24px!important;line-height:31px!important}
.feat-title{font-size:20px!important;line-height:28px!important}
.row-title{font-size:16px!important;line-height:23px!important}
.row-thumb{width:88px!important;padding-right:10px!important}
.row-thumb img{width:88px!important}
}
@media (prefers-color-scheme:dark){
.bg-page{background:${C.dPage}!important}
.bg-shell{background:${C.dShell}!important}
.ink{color:${C.dInk}!important}
.ink2{color:${C.dInk2}!important}
.muted{color:${C.dMuted}!important}
.line{border-color:${C.dLine}!important}
.brand{color:${C.dBrand}!important}
.btn-txt{color:${C.dPage}!important}
${darkCss}
}
[data-ogsc] .ink{color:${C.dInk}!important}[data-ogsc] .ink2{color:${C.dInk2}!important}[data-ogsc] .muted{color:${C.dMuted}!important}[data-ogsc] .brand{color:${C.dBrand}!important}[data-ogsb] .bg-page{background:${C.dPage}!important}[data-ogsb] .bg-shell{background:${C.dShell}!important}
${ogscCss}
</style>
</head>
<body class="bg-page" style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};">${esc(preheader)}${'&#847;&zwnj;&nbsp;'.repeat(80)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg-page" bgcolor="${C.page}" style="background:${C.page};">
<tr><td align="center" class="outer" style="padding:20px 12px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="shell bg-shell" bgcolor="${C.shell}" style="max-width:600px;background:${C.shell};border-radius:24px;">

<tr><td class="px" style="padding:20px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle" style="width:32px;"><a href="${home}"><img src="${SITE}/profile.jpeg" width="32" height="32" alt="yceffort" style="display:block;width:32px;height:32px;border:0;border-radius:16px;"></a></td>
    <td valign="middle" style="padding-left:10px;font-family:${SANS};font-size:15px;line-height:20px;font-weight:800;letter-spacing:-0.01em;"><a href="${home}" class="ink" style="color:${C.ink};text-decoration:none;">yceffort</a></td>
    <td valign="middle" align="right" class="muted" style="font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:0.14em;color:${C.muted};">WEEKLY&nbsp;&nbsp;No.${week}</td>
  </tr></table>
</td></tr>

<tr><td class="px" style="padding:22px 32px 0;">
  <p class="brand" style="margin:0 0 8px;font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:0.14em;color:${C.brand};">&#9670;&nbsp;${from.replace(/-/g, '.')} ~ ${md(to)}</p>
  <h1 class="ink hero-title" style="margin:0;font-family:${SANS};font-size:26px;line-height:34px;font-weight:800;letter-spacing:-0.03em;color:${C.ink};word-break:keep-all;">한 주 동안 쓴 글 <span class="brand" style="color:${C.brand};">${posts.length}편</span></h1>
</td></tr>

<tr><td class="px" style="padding:18px 32px 20px;"><div class="line" style="border-top:1px solid ${C.line};height:0;line-height:0;font-size:0;">&nbsp;</div></td></tr>
${featuredHtml}
${rest.length ? `<tr><td class="px" style="padding:26px 32px 10px;"><p class="muted" style="margin:0;font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:0.14em;color:${C.muted};">MORE THIS WEEK</p></td></tr>${rest.map(rowHtml).join('')}` : ''}

<tr><td class="px" style="padding:20px 32px 24px;">
  <div class="line" style="border-top:1px solid ${C.line};height:0;line-height:0;font-size:0;">&nbsp;</div>
  <p class="muted" style="margin:16px 0 0;font-family:${SANS};font-size:13px;line-height:21px;color:${C.muted};word-break:keep-all;">yceffort.kr에서 새 글 소식을 신청하신 분께 매주 한 번 보냅니다. 글이 없는 주에는 보내지 않습니다. 이 메일에 답장하시면 저에게 바로 옵니다.</p>
  <p style="margin:12px 0 0;font-family:${SANS};font-size:13px;line-height:21px;">
    <a href="${home}" class="ink2" style="color:${C.ink2};text-decoration:underline;">블로그</a>&nbsp;&nbsp;&nbsp;
    <a href="${SITE}/feed.xml" class="ink2" style="color:${C.ink2};text-decoration:underline;">RSS</a>&nbsp;&nbsp;&nbsp;
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" class="ink2" style="color:${C.ink2};text-decoration:underline;">구독 해지</a>
  </p>
</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`

  const text = [
    `yceffort WEEKLY No.${week} (${from} ~ ${to})`,
    `한 주 동안 쓴 글 ${posts.length}편`,
    '',
    ...[featured, ...rest].flatMap((p) => [
      `[${label(p)}] ${plainTitle(p.title)} (${md(p.day)} ${dow(p.day)}, ${p.minutes}분)`,
      p.description,
      plainUrl(p),
      '',
    ]),
    '구독 해지: {{{RESEND_UNSUBSCRIBE_URL}}}',
  ].join('\n')

  return {subject, preheader, campaign, html, text, posts}
}

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = arg('out') || process.cwd()
  const result = renderWeekly({
    from: arg('from'),
    to: arg('to'),
    featured: arg('featured'),
  })
  if (!result) {
    console.log('no posts in range')
    process.exit(0)
  }
  fs.writeFileSync(path.join(out, 'email.html'), result.html)
  fs.writeFileSync(path.join(out, 'email.txt'), result.text)
  console.log(result.subject)
  console.log(
    result.posts
      .map(
        (p) =>
          `${p.day} ${p.hue.padEnd(6)} ${p.minutes}min ${p.thumbnail ? 'thumb' : '-'} ${p.slug}`,
      )
      .join('\n'),
  )
  console.log(`html ${Buffer.byteLength(result.html)} bytes -> ${out}`)
}
