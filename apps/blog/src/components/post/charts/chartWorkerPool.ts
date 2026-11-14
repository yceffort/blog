import type {WorkerCommand, WorkerReply, WorkerRequest} from './workerProtocol'

interface Subscriber {
  ready: () => void
  fail: () => void
}
interface Pool {
  worker: Worker
  subscribers: Map<number, Subscriber>
}
let pool: Pool | undefined
let nextId = 0
let disabled = false

/** Share one worker across active renderers; release it with the last owner. */
export function acquireChartWorker(subscriber: Subscriber) {
  if (
    disabled ||
    typeof Worker === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    !HTMLCanvasElement.prototype.transferControlToOffscreen
  )
    return null
  if (!pool) {
    try {
      const worker = new Worker(new URL('./chart.worker.ts', import.meta.url), {
        type: 'module',
        name: 'blog-charts',
      })
      const created: Pool = {worker, subscribers: new Map()}
      pool = created
      worker.addEventListener(
        'message',
        ({data}: MessageEvent<WorkerReply>) => {
          const owner = created.subscribers.get(data.id)
          if (data.type === 'rendered') owner?.ready()
          else if (data.type === 'error') owner?.fail()
        },
      )
      const fail = () => {
        disabled = true
        if (pool === created) pool = undefined
        const owners = [...created.subscribers.values()]
        created.subscribers.clear()
        worker.terminate()
        owners.forEach((owner) => owner.fail())
      }
      worker.addEventListener('error', (event) => {
        event.preventDefault()
        fail()
      })
      worker.addEventListener('messageerror', fail)
    } catch {
      disabled = true
      return null
    }
  }
  const current = pool
  const id = ++nextId
  current.subscribers.set(id, subscriber)
  return {
    post(message: WorkerCommand, transfer: Transferable[] = []) {
      current.worker.postMessage({...message, id}, transfer)
    },
    release() {
      if (!current.subscribers.delete(id)) return
      current.worker.postMessage({type: 'destroy', id} satisfies WorkerRequest)
      if (current.subscribers.size === 0) {
        current.worker.terminate()
        if (pool === current) pool = undefined
      }
    },
  }
}
