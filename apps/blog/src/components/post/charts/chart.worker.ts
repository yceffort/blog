import {
  createChart,
  movePointer,
  resizeChart,
  type CanvasSize,
  type RenderInput,
} from './chartEngine'
import type {WorkerReply, WorkerRequest} from './workerProtocol'

type Entry = {
  canvas: OffscreenCanvas
  chart: ReturnType<typeof createChart>
  input: RenderInput
  size: CanvasSize
}
const charts = new Map<number, Entry>()

// No DOM or React imports in this entry. Config callbacks are created here,
// since functions cannot be sent through structured clone.
globalThis.addEventListener(
  'message',
  ({data}: MessageEvent<WorkerRequest>) => {
    const entry = charts.get(data.id)
    try {
      if (data.type === 'init') {
        entry?.chart.destroy()
        const chart = createChart(data.canvas, data.input, data.size)
        charts.set(data.id, {
          canvas: data.canvas,
          chart,
          input: data.input,
          size: data.size,
        })
      } else if (!entry) {
        return
      } else if (data.type === 'destroy') {
        entry.chart.destroy()
        charts.delete(data.id)
        return
      } else if (data.type === 'update') {
        entry.chart.destroy()
        entry.input = data.input
        entry.chart = createChart(entry.canvas, entry.input, entry.size)
      } else if (data.type === 'resize') {
        entry.size = data.size
        resizeChart(entry.chart, data.size)
      } else if (data.type === 'pointer') {
        movePointer(entry.chart, data.x, data.y, data.leave)
        return
      }
      globalThis.postMessage({
        id: data.id,
        type: 'rendered',
      } satisfies WorkerReply)
    } catch {
      charts.get(data.id)?.chart.destroy()
      charts.delete(data.id)
      globalThis.postMessage({id: data.id, type: 'error'} satisfies WorkerReply)
    }
  },
)
