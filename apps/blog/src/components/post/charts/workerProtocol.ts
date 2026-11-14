import type {CanvasSize, RenderInput} from './chartEngine'

export type WorkerCommand =
  | {
      type: 'init'
      canvas: OffscreenCanvas
      input: RenderInput
      size: CanvasSize
    }
  | {type: 'update'; input: RenderInput}
  | {type: 'resize'; size: CanvasSize}
  | {type: 'pointer'; x: number; y: number; leave: boolean}
  | {type: 'destroy'}

export type WorkerRequest = {id: number} & WorkerCommand

export type WorkerReply =
  | {id: number; type: 'rendered'}
  | {id: number; type: 'error'}
