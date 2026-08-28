import {useCallback, useEffect, useRef, useState} from 'react'

export type DrawTool = 'pen' | 'highlighter' | 'eraser' | 'text'

// 드로잉 캔버스 상태 + 핸들러 (펜/형광펜/지우개/텍스트)
export function useDrawing(isDrawingMode: boolean, activeIndex: number) {
  const [drawTool, setDrawTool] = useState<DrawTool>('pen')
  const [drawColor, setDrawColor] = useState('#ef4444')
  const [textPos, setTextPos] = useState<{x: number; y: number} | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const textInputRef = useRef<HTMLInputElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{x: number; y: number} | null>(null)

  // 드로잉 캔버스 크기 동기화
  useEffect(() => {
    if (!isDrawingMode) {
      return undefined
    }
    const canvas = canvasRef.current
    if (!canvas) {
      return undefined
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [isDrawingMode])

  // 슬라이드 이동 시 드로잉 클리어
  useEffect(() => {
    setTextPos(null)
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }, [activeIndex])

  // 드로잉 모드 종료 시 텍스트 입력 취소
  useEffect(() => {
    if (!isDrawingMode) {
      setTextPos(null)
    }
  }, [isDrawingMode])

  // 지정한 위치에 텍스트를 캔버스로 굽는다
  const drawText = useCallback(
    (pos: {x: number; y: number}, value: string) => {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx || !value.trim()) {
        return
      }
      ctx.save()
      ctx.font = '24px sans-serif'
      ctx.textBaseline = 'top'
      ctx.fillStyle = drawColor
      ctx.fillText(value, pos.x, pos.y)
      ctx.restore()
    },
    [drawColor],
  )

  const handleDrawStart = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }
      if (drawTool === 'text') {
        // preventDefault 없이는 뒤이은 mousedown의 기본 동작이 포커스를 body로
        // 옮겨서, 방금 띄운 입력창이 blur -> 언마운트로 즉시 사라진다
        e.preventDefault()
        const input = textInputRef.current
        if (input && textPos) {
          drawText(textPos, input.value)
          input.value = ''
        }
        const rect = canvas.getBoundingClientRect()
        setTextPos({x: e.clientX - rect.left, y: e.clientY - rect.top})
        return
      }
      canvas.setPointerCapture(e.pointerId)
      drawingRef.current = true
      const rect = canvas.getBoundingClientRect()
      lastPointRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    [drawTool, textPos, drawText],
  )

  const handleDrawMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) {
        return
      }
      const canvas = canvasRef.current
      const last = lastPointRef.current
      if (!canvas || !last) {
        return
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }
      const rect = canvas.getBoundingClientRect()
      const point = {x: e.clientX - rect.left, y: e.clientY - rect.top}

      ctx.save()
      if (drawTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = 24
      } else if (drawTool === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = drawColor
        ctx.globalAlpha = 0.35
        ctx.lineWidth = 18
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = drawColor
        ctx.globalAlpha = 1
        ctx.lineWidth = 2.5
      }
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
      ctx.restore()

      lastPointRef.current = point
    },
    [drawTool, drawColor],
  )

  const handleDrawEnd = useCallback(() => {
    drawingRef.current = false
    lastPointRef.current = null
  }, [])

  // 입력한 텍스트를 캔버스에 그리기
  const commitText = useCallback(
    (value: string) => {
      if (textPos) {
        drawText(textPos, value)
      }
      setTextPos(null)
    },
    [textPos, drawText],
  )

  const cancelText = useCallback(() => {
    setTextPos(null)
  }, [])

  const handleClearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  return {
    canvasRef,
    textInputRef,
    drawTool,
    setDrawTool,
    drawColor,
    setDrawColor,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    handleClearCanvas,
    textPos,
    commitText,
    cancelText,
  }
}
