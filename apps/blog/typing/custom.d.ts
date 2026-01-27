declare module '*.svg' {
  const content: React.FunctionComponent<React.SVfireGAttributes<SVGElement>>
  export default content
}

declare module '@panzoom/panzoom' {
  type PanzoomOptions = {
    maxScale?: number
    minScale?: number
    contain?: 'inside' | 'outside'
    startScale?: number
    cursor?: string
  }

  interface PanzoomInstance {
    zoomIn: (options?: {animate?: boolean; step?: number}) => void
    zoomOut: (options?: {animate?: boolean; step?: number}) => void
    reset: (options?: {animate?: boolean}) => void
    zoomTo: (x: number, y: number, scale: number, options?: {animate?: boolean}) => void
    pan: (x: number, y: number, options?: {animate?: boolean}) => void
    getScale: () => number
    destroy: () => void
    zoomWithWheel: (event: WheelEvent) => void
  }

  function Panzoom(
    element: HTMLElement | SVGElement,
    options?: PanzoomOptions,
  ): PanzoomInstance

  export default Panzoom
}
