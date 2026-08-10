import {useEffect, useRef} from 'react'

// 레이저 포인터 마우스 추적 (부드러운 lerp)
export function useLaserPointer(isLaserMode: boolean) {
  const laserRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isLaserMode) {
      return undefined
    }
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let currentX = targetX
    let currentY = targetY
    let raf = 0

    const tick = () => {
      currentX += (targetX - currentX) * 0.25
      currentY += (targetY - currentY) * 0.25
      const el = laserRef.current
      if (el) {
        el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`
      }
      raf = window.requestAnimationFrame(tick)
    }

    const handleMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    window.addEventListener('mousemove', handleMove, {passive: true})
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (raf) {
        window.cancelAnimationFrame(raf)
      }
    }
  }, [isLaserMode])

  return laserRef
}
