import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'

import {detectBot} from './constants/bot-signatures'

const YEAR_RE = /^(19|20)\d{2}$/
// [year]/[...slug] 라우트가 아무 문자열이나 연도로 받아 PPR 셸을 200으로 반환하므로,
// 유효할 수 없는 경로는 라우팅 전에 걸러 진짜 404를 반환한다
const MULTI_SEGMENT_PREFIXES = new Set([
  'tags',
  'pages',
  'series',
  'demos',
  'LCP',
  'splash',
  'thumbnails',
])
const EN_PREFIXES = new Set(['pages', 'feed.xml'])

export function proxy(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  const {isBot, botName, botCategory} = detectBot(userAgent)
  const pathname = request.nextUrl.pathname

  if (pathname.includes('%23')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.split('%23')[0]
    url.search = ''
    return NextResponse.redirect(url, {status: 308})
  }

  // Locale redirect on root path
  if (pathname === '/') {
    const localeCookie = request.cookies.get('locale')?.value

    if (localeCookie === 'en') {
      return NextResponse.redirect(new URL('/en', request.url))
    }

    if (!localeCookie) {
      const acceptLang = request.headers.get('accept-language') ?? ''
      const prefersKorean = acceptLang
        .split(',')
        .some((l) => l.trim().toLowerCase().startsWith('ko'))

      if (!prefersKorean && acceptLang) {
        const response = NextResponse.redirect(new URL('/en', request.url))
        response.cookies.set('locale', 'en', {
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
        })
        return response
      }
    }
  }

  const segments = pathname.split('/').filter(Boolean)
  const isEnPath = segments[0] === 'en'
  const rest = isEnPath ? segments.slice(1) : segments
  if (rest.length >= (isEnPath ? 1 : 2)) {
    const prefixes = isEnPath ? EN_PREFIXES : MULTI_SEGMENT_PREFIXES
    if (!YEAR_RE.test(rest[0]) && !prefixes.has(rest[0])) {
      // 어떤 라우트에도 매칭되지 않는 경로로 rewrite하면 not-found가 404 상태 코드와 함께 렌더링된다
      return NextResponse.rewrite(new URL('/__not-found', request.url))
    }
  }

  const response = NextResponse.next()

  response.headers.set('x-is-bot', isBot ? '1' : '0')
  if (botName) {
    response.headers.set('x-bot-name', botName)
  }
  if (botCategory) {
    response.headers.set('x-bot-category', botCategory)
  }

  if (isBot) {
    // eslint-disable-next-line no-console
    console.log(
      `[Bot Visit] ${botCategory}/${botName} - ${pathname} - ${userAgent.slice(0, 100)}`,
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
