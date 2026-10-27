/**
 * iOS 홈 화면 앱의 스플래시 이미지를 blog와 news에 만든다.
 * 아이콘을 흐리게 깔아 화면을 채우고, 그 위에 아이콘과 이름을 올린다.
 *
 * 사용법: node apps/blog/scripts/generate-splash.mjs
 * 결과: apps/{app}/public/splash/*.jpg, apps/{app}/src/splash.json(layout이 읽는 link 목록)
 * 글자는 macOS의 Apple SD Gothic Neo로 그린다. 다른 OS에서 돌리면 글꼴이 바뀐다.
 */
import {mkdir, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import sharp from 'sharp'

const appsDir = fileURLToPath(new URL('../..', import.meta.url))

const APPS = [
  {
    dir: 'blog',
    name: 'yceffort',
    tagline: 'Frontend-focused full stack engineer',
  },
  {dir: 'news', name: 'yceffort news', tagline: '매일 아침 10시, 오늘 읽을 글'},
]

// 세로 화면 iPhone. [CSS 폭, CSS 높이, 픽셀 비율]
const DEVICES = [
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [420, 912, 3], // Air
  [402, 874, 3], // 16 Pro, 17, 17 Pro
  [430, 932, 3], // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  [428, 926, 3], // 12 Pro Max, 13 Pro Max, 14 Plus
  [414, 896, 3], // XS Max, 11 Pro Max
  [393, 852, 3], // 14 Pro, 15, 15 Pro, 16
  [390, 844, 3], // 12, 13, 14, 16e
  [375, 812, 3], // X, XS, 11 Pro, 12 mini, 13 mini
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6 Plus to 8 Plus
  [375, 667, 2], // 6 to 8, SE 2, SE 3
]

const FONT = 'Apple SD Gothic Neo, Helvetica Neue, sans-serif'

async function render(app, icon, cssWidth, cssHeight, dpr) {
  const width = cssWidth * dpr
  const height = cssHeight * dpr
  const size = 240 * dpr
  const radius = Math.round(size * 0.225)
  const top = Math.round(height / 2 - size / 2 - 50 * dpr)
  const left = Math.round(width / 2 - size / 2)
  const textY = top + size + 56 * dpr

  const mask = `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}"/></svg>`
  const roundedIcon = await sharp(icon)
    .resize(size, size, {kernel: 'lanczos3'})
    .composite([{input: Buffer.from(mask), blend: 'dest-in'}])
    .png()
    .toBuffer()
  const overlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${18 * dpr}"/></filter></defs>
    <rect x="${left}" y="${top + 12 * dpr}" width="${size}" height="${size}" rx="${radius}" fill="rgba(0,0,0,0.35)" filter="url(#s)"/>
  </svg>`
  const text = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${width / 2}" y="${textY}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${30 * dpr}" fill="#ffffff">${app.name}</text>
    <text x="${width / 2}" y="${textY + 34 * dpr}" text-anchor="middle" font-family="${FONT}" font-size="${16 * dpr}" fill="rgba(255,255,255,0.85)">${app.tagline}</text>
  </svg>`

  const background = await sharp(icon)
    .resize(width, height, {fit: 'cover'})
    .blur(20 * dpr)
    .modulate({brightness: 0.75})
    .toBuffer()
  return sharp(background)
    .composite([
      {input: Buffer.from(overlay)},
      {input: roundedIcon, top, left},
      {input: Buffer.from(text)},
    ])
    .jpeg({quality: 85, mozjpeg: true})
    .toBuffer()
}

for (const app of APPS) {
  const appDir = resolve(appsDir, app.dir)
  const icon = resolve(appDir, 'public/favicon/web-app-manifest-512x512.png')
  const outDir = resolve(appDir, 'public/splash')
  await mkdir(outDir, {recursive: true})

  const links = []
  for (const [cssWidth, cssHeight, dpr] of DEVICES) {
    const file = `${cssWidth * dpr}x${cssHeight * dpr}.jpg`
    await writeFile(
      resolve(outDir, file),
      await render(app, icon, cssWidth, cssHeight, dpr),
    )
    links.push({
      url: `/splash/${file}`,
      media: `(device-width: ${cssWidth}px) and (device-height: ${cssHeight}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
    })
  }
  await writeFile(
    resolve(appDir, 'src/splash.json'),
    `${JSON.stringify(links, null, 2)}\n`,
  )
  console.log(`${app.dir}: ${links.length} splash images`)
}
