import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import type {WorkerRequest} from './workerProtocol'

class FakeWorker extends EventTarget {
  static instances: FakeWorker[] = []
  messages: WorkerRequest[] = []
  terminate = vi.fn()
  constructor() {
    super()
    FakeWorker.instances.push(this)
  }
  postMessage(message: WorkerRequest) {
    this.messages.push(message)
  }
}

beforeEach(() => {
  vi.resetModules()
  FakeWorker.instances = []
  vi.stubGlobal('Worker', FakeWorker)
  vi.stubGlobal('OffscreenCanvas', vi.fn())
  vi.stubGlobal(
    'HTMLCanvasElement',
    class {
      transferControlToOffscreen() {}
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

const owner = () => ({ready: vi.fn(), fail: vi.fn()})

describe('chart worker ownership', () => {
  it('keeps a shared worker until the last chart leaves, then creates a fresh worker on return', async () => {
    const {acquireChartWorker} = await import('./chartWorkerPool')
    const first = acquireChartWorker(owner())!
    const second = acquireChartWorker(owner())!
    expect(FakeWorker.instances).toHaveLength(1)
    first.release()
    expect(FakeWorker.instances[0].terminate).not.toHaveBeenCalled()
    second.release()
    second.release()
    expect(FakeWorker.instances[0].terminate).toHaveBeenCalledOnce()
    const restored = acquireChartWorker(owner())!
    expect(FakeWorker.instances).toHaveLength(2)
    restored.release()
  })

  it('falls back every live chart after a worker crash and avoids a restart loop', async () => {
    const {acquireChartWorker} = await import('./chartWorkerPool')
    const a = owner(),
      b = owner()
    const first = acquireChartWorker(a)!,
      second = acquireChartWorker(b)!
    const worker = FakeWorker.instances[0]
    worker.dispatchEvent(new Event('error', {cancelable: true}))
    expect(a.fail).toHaveBeenCalledOnce()
    expect(b.fail).toHaveBeenCalledOnce()
    first.release()
    second.release()
    expect(worker.terminate).toHaveBeenCalledOnce()
    expect(acquireChartWorker(owner())).toBeNull()
  })

  it('isolates a chart render failure and ignores late messages after release', async () => {
    const {acquireChartWorker} = await import('./chartWorkerPool')
    const a = owner(),
      b = owner()
    const first = acquireChartWorker(a)!,
      second = acquireChartWorker(b)!
    first.post({type: 'pointer', x: 0, y: 0, leave: true})
    const worker = FakeWorker.instances[0],
      id = worker.messages[0].id
    worker.dispatchEvent(
      new MessageEvent('message', {data: {id, type: 'error'}}),
    )
    expect(a.fail).toHaveBeenCalledOnce()
    expect(b.fail).not.toHaveBeenCalled()
    first.release()
    worker.dispatchEvent(
      new MessageEvent('message', {data: {id, type: 'rendered'}}),
    )
    expect(a.ready).not.toHaveBeenCalled()
    expect(worker.terminate).not.toHaveBeenCalled()
    second.release()
  })

  it('returns a fallback when transfer is unsupported or construction is blocked', async () => {
    const {acquireChartWorker} = await import('./chartWorkerPool')
    vi.stubGlobal('HTMLCanvasElement', {prototype: {}})
    expect(acquireChartWorker(owner())).toBeNull()
    expect(FakeWorker.instances).toHaveLength(0)
    vi.stubGlobal(
      'HTMLCanvasElement',
      class {
        transferControlToOffscreen() {}
      },
    )
    vi.stubGlobal(
      'Worker',
      vi.fn(function BlockedWorker() {
        throw new Error('Blocked')
      }),
    )
    expect(acquireChartWorker(owner())).toBeNull()
  })
})
