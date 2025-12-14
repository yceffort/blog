import {NextRequest, NextResponse} from 'next/server'

const SEOUL_COORDS = {latitude: 37.5665, longitude: 126.978}
const ALLOWED_ORIGINS = ['yceffort.kr', 'localhost']
const CACHE_TTL = 60 * 60 * 1000 // 1시간

interface CacheEntry {
  weatherCode: number | null
  timestamp: number
}

const cache = new Map<string, CacheEntry>()

function getCacheKey(lat: number, lon: number): string {
  // 소수점 1자리로 반올림 (약 11km 반경 내 동일 캐시)
  return `${lat.toFixed(1)},${lon.toFixed(1)}`
}

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

  const cacheKey = getCacheKey(coords.latitude, coords.longitude)
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({
      weatherCode: cached.weatherCode,
      cached: true,
    })
  }

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=weather_code`,
    )

    if (!res.ok) {
      return NextResponse.json({error: 'Failed to fetch weather'}, {status: 500})
    }

    const data = await res.json()
    const weatherCode = data.current?.weather_code ?? null

    cache.set(cacheKey, {
      weatherCode,
      timestamp: Date.now(),
    })

    return NextResponse.json({weatherCode})
  } catch {
    return NextResponse.json({error: 'Failed to fetch weather'}, {status: 500})
  }
}
