import {NextRequest, NextResponse} from 'next/server'

const SEOUL_COORDS = {latitude: 37.5665, longitude: 126.978}
const ALLOWED_ORIGINS = ['yceffort.kr', 'localhost']

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  const checkDomain = (url: string | null) => {
    if (!url) return false
    return ALLOWED_ORIGINS.some((domain) => url.includes(domain))
  }

  return checkDomain(origin) || checkDomain(referer)
}

export async function GET(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({error: 'Forbidden'}, {status: 403})
  }

  const searchParams = request.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  const coords = {
    latitude: lat ? parseFloat(lat) : SEOUL_COORDS.latitude,
    longitude: lon ? parseFloat(lon) : SEOUL_COORDS.longitude,
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=weather_code`,
      {next: {revalidate: 600}},
    )

    if (!res.ok) {
      return NextResponse.json({error: 'Failed to fetch weather'}, {status: 500})
    }

    const data = await res.json()

    return NextResponse.json({
      weatherCode: data.current?.weather_code ?? null,
    })
  } catch {
    return NextResponse.json({error: 'Failed to fetch weather'}, {status: 500})
  }
}
