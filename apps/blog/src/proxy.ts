import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'

import {detectBot} from './constants/bot-signatures'

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
