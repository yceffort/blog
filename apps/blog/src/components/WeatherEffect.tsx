'use client'

import {useEffect, useRef, useState, useCallback} from 'react'

type WeatherType = 'rain' | 'snow' | null

interface Particle {
  x: number
  y: number
  speed: number
  size: number
  opacity: number
}

const RAIN_CODES = [
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]
const SNOW_CODES = [71, 73, 75, 77, 85, 86]

function getWeatherType(code: number): WeatherType {
  if (RAIN_CODES.includes(code)) {
    return 'rain'
  }
  if (SNOW_CODES.includes(code)) {
    return 'snow'
  }
  return null
}

export default function WeatherEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)
  const [weatherType, setWeatherType] = useState<WeatherType>(null)
  const [isVisible, setIsVisible] = useState(true)

  const fetchWeather = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    const weatherParam = params.get('weather')

    if (weatherParam === 'rain' || weatherParam === 'snow') {
      setWeatherType(weatherParam)
      return
    }

    try {
      let lat: number | undefined
      let lon: number | undefined

      if ('geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 600000,
              })
            },
          )
          lat = position.coords.latitude
          lon = position.coords.longitude
        } catch {
          // Use Seoul as fallback (handled by API)
        }
      }

      const apiUrl =
        lat && lon ? `/api/weather?lat=${lat}&lon=${lon}` : '/api/weather'

      const res = await fetch(apiUrl)
      const data = await res.json()

      if (typeof data.weatherCode === 'number') {
        setWeatherType(getWeatherType(data.weatherCode))
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(fetchWeather, {timeout: 5000})
      return () => window.cancelIdleCallback(id)
    } else {
      const timer = setTimeout(fetchWeather, 2000)
      return () => clearTimeout(timer)
    }
  }, [fetchWeather])

  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => {
    if (!weatherType || !canvasRef.current || !isVisible) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()

    const particleCount = weatherType === 'snow' ? 80 : 150
    const particles = particlesRef.current

    if (particles.length === 0) {
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed:
            weatherType === 'snow'
              ? 0.5 + Math.random() * 1.5
              : 4 + Math.random() * 6,
          size:
            weatherType === 'snow'
              ? 2 + Math.random() * 3
              : 1 + Math.random() * 1.5,
          opacity: 0.3 + Math.random() * 0.5,
        })
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        ctx.beginPath()

        if (weatherType === 'snow') {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`
          ctx.fill()

          p.x += Math.sin(p.y * 0.01) * 0.5
          p.y += p.speed
        } else {
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + 0.5, p.y + p.size * 8)
          ctx.strokeStyle = `rgba(174, 194, 224, ${p.opacity})`
          ctx.lineWidth = p.size * 0.5
          ctx.stroke()

          p.y += p.speed
          p.x += 0.5
        }

        if (p.y > canvas.height) {
          p.y = -10
          p.x = Math.random() * canvas.width
        }
        if (p.x > canvas.width) {
          p.x = 0
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      resizeCanvas()
    }

    window.addEventListener('resize', handleResize, {passive: true})

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [weatherType, isVisible])

  if (!weatherType) {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9998]"
      aria-hidden="true"
    />
  )
}
