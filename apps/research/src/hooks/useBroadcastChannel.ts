'use client'

import {useCallback, useEffect, useRef} from 'react'

interface SlideMessage {
  type: 'SLIDE_CHANGE' | 'SYNC_REQUEST' | 'SYNC_RESPONSE'
  index: number
  source: 'audience' | 'presenter'
}

interface UseBroadcastChannelOptions {
  onSlideChange?: (index: number) => void
  onSyncRequest?: () => number
}

export function useBroadcastChannel(
  channelName: string,
  options: UseBroadcastChannelOptions = {},
) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (typeof window === 'undefined') return

    const channel = new BroadcastChannel(channelName)
    channelRef.current = channel

    channel.onmessage = (event: MessageEvent<SlideMessage>) => {
      const data = event.data
      if (data.type === 'SLIDE_CHANGE' && optionsRef.current.onSlideChange) {
        optionsRef.current.onSlideChange(data.index)
      }
      if (data.type === 'SYNC_REQUEST' && optionsRef.current.onSyncRequest) {
        const currentIndex = optionsRef.current.onSyncRequest()
        channel.postMessage({
          type: 'SYNC_RESPONSE',
          index: currentIndex,
          source: 'audience',
        } satisfies SlideMessage)
      }
      if (data.type === 'SYNC_RESPONSE' && optionsRef.current.onSlideChange) {
        optionsRef.current.onSlideChange(data.index)
      }
    }

    return () => channel.close()
  }, [channelName])

  const sendSlideChange = useCallback(
    (index: number, source: 'audience' | 'presenter') => {
      channelRef.current?.postMessage({
        type: 'SLIDE_CHANGE',
        index,
        source,
      } satisfies SlideMessage)
    },
    [],
  )

  const requestSync = useCallback(() => {
    channelRef.current?.postMessage({
      type: 'SYNC_REQUEST',
      index: 0,
      source: 'presenter',
    } satisfies SlideMessage)
  }, [])

  return {sendSlideChange, requestSync}
}
