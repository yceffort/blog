import type {CanvasSize, RenderInput} from './chartEngine'
import {acquireChartWorker} from './chartWorkerPool'

/** Owns the DOM canvas, its worker lease, and all observers for one mounted chart. */
export function mountChart(host: HTMLDivElement) {
  let disposed = false
  let input: RenderInput | undefined
  let label = ''
  let mode: 'new' | 'worker' | 'loading-main' | 'main' = 'new'
  let lease: ReturnType<typeof acquireChartWorker> = null
  let engine: typeof import('./chartEngine') | undefined
  let chart: ReturnType<NonNullable<typeof engine>['createChart']> | undefined
  let startupTimer: ReturnType<typeof setTimeout> | undefined
  let frame = 0
  let pointer: {x: number; y: number; leave: boolean} | undefined
  const readSize = (): CanvasSize => ({
    width: Math.floor(host.clientWidth),
    height: Math.floor(host.clientHeight),
    dpr: window.devicePixelRatio || 1,
  })
  let size = readSize()

  function makeCanvas() {
    const element = document.createElement('canvas')
    element.setAttribute('role', 'img')
    element.setAttribute('aria-label', label)
    element.style.width = '100%'
    element.style.height = '100%'
    element.style.display = 'block'
    host.append(element)
    return element
  }
  let canvas = makeCanvas()

  function ready() {
    if (disposed) return
    clearTimeout(startupTimer)
    host.dataset.chartState = 'ready'
  }

  function paintMain() {
    if (!engine || !input || size.width <= 0 || size.height <= 0) return
    chart?.destroy()
    chart = engine.createChart(canvas, input, size)
    ready()
  }

  function fallback() {
    if (disposed || mode === 'loading-main' || mode === 'main') return
    mode = 'loading-main'
    clearTimeout(startupTimer)
    lease?.release()
    lease = null
    // An OffscreenCanvas transfer cannot be reversed or repeated, including in Strict Mode.
    canvas.remove()
    canvas = makeCanvas()
    host.dataset.chartThread = 'main'
    void import('./chartEngine')
      .then((module) => {
        if (disposed) return undefined
        engine = module
        mode = 'main'
        paintMain()
        return undefined
      })
      .catch(() => {
        if (disposed) return
        host.dataset.chartState = 'error'
        canvas.remove()
        const message = document.createElement('p')
        message.textContent =
          input?.locale === 'en'
            ? 'Unable to draw the chart. The measurements are in the table below.'
            : '그래프를 그리지 못했습니다. 아래 표에서 측정값을 확인할 수 있습니다.'
        host.append(message)
      })
  }

  function render() {
    if (!input || size.width <= 0 || size.height <= 0 || disposed) return
    host.dataset.chartState = 'loading'
    if (mode === 'main') {
      paintMain()
    } else if (mode === 'worker') {
      lease?.post({type: 'update', input})
    } else if (mode === 'new') {
      lease = acquireChartWorker({ready, fail: fallback})
      if (!lease) {
        fallback()
        return
      }
      try {
        const offscreen = canvas.transferControlToOffscreen()
        mode = 'worker'
        host.dataset.chartThread = 'worker'
        startupTimer = setTimeout(fallback, 10000)
        lease.post({type: 'init', canvas: offscreen, input, size}, [offscreen])
      } catch {
        fallback()
      }
    }
  }

  function resize() {
    const next = readSize()
    if (next.width <= 0 || next.height <= 0) return
    if (
      next.width === size.width &&
      next.height === size.height &&
      next.dpr === size.dpr
    )
      return
    size = next
    if (mode === 'new') render()
    else if (mode === 'worker') lease?.post({type: 'resize', size})
    else if (mode === 'main' && chart) engine?.resizeChart(chart, size)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  window.addEventListener('resize', resize, {passive: true})
  let resolution: MediaQueryList
  function watchResolution() {
    resolution?.removeEventListener('change', watchResolution)
    resize()
    resolution = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
    resolution.addEventListener('change', watchResolution)
  }
  watchResolution()

  function sendPointer(event: PointerEvent) {
    // Touch pointers leave immediately after a tap; keep the tooltip until a
    // subsequent tap or a scroll cancellation instead of erasing it that frame.
    if (event.type === 'pointerleave' && event.pointerType === 'touch') return
    const rect = canvas.getBoundingClientRect()
    pointer = {
      x: ((event.clientX - rect.left) * size.width) / rect.width,
      y: ((event.clientY - rect.top) * size.height) / rect.height,
      leave: event.type === 'pointerleave' || event.type === 'pointercancel',
    }
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      if (!pointer || disposed) return
      if (mode === 'worker') lease?.post({type: 'pointer', ...pointer})
      else if (mode === 'main' && chart)
        engine?.movePointer(chart, pointer.x, pointer.y, pointer.leave)
    })
  }
  const events = [
    'pointermove',
    'pointerdown',
    'pointerleave',
    'pointercancel',
  ] as const
  events.forEach((type) =>
    host.addEventListener(type, sendPointer, {passive: true}),
  )

  return {
    update(next: RenderInput, nextLabel: string) {
      input = next
      label = nextLabel
      canvas.setAttribute('aria-label', label)
      render()
    },
    dispose() {
      disposed = true
      clearTimeout(startupTimer)
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      resolution?.removeEventListener('change', watchResolution)
      events.forEach((type) => host.removeEventListener(type, sendPointer))
      lease?.release()
      chart?.destroy()
      host.replaceChildren()
    },
  }
}
