import {NextResponse} from 'next/server'

import {detectBot} from './constants/bot-signatures'

import type {NextRequest} from 'next/server'

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''
  const {isBot, botName, botCategory} = detectBot(userAgent)

  const response = NextResponse.next()

  response.headers.set('x-is-bot', isBot ? '1' : '0')
  if (botName) {
    response.headers.set('x-bot-name', botName)
  }
  if (botCategory) {
    response.headers.set('x-bot-category', botCategory)
  }

  if (isBot) {
    const path = request.nextUrl.pathname
    // eslint-disable-next-line no-console
    console.log(
      `[Bot Visit] ${botCategory}/${botName} - ${path} - ${userAgent.slice(0, 100)}`,
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
