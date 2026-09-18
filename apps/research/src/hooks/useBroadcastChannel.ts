'use client'

import {useCallback, useEffect, useRef} from 'react'

interface SlideMessage {
  type: 'SLIDE_CHANGE' | 'SYNC_REQUEST' | 'SYNC_RESPONSE'
  index: number
  showHiddenSlides?: boolean
  source: 'audience' | 'presenter'
}

interface UseBroadcastChannelOptions {
  onSlideChange?: (index: number, showHiddenSlides: boolean) => void
  onSyncRequest?: () => {index: number; showHiddenSlides: boolean}
}

export function useBroadcastChannel(
  channelName: string,
  options: UseBroadcastChannelOptions = {},
) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const channel = new BroadcastChannel(channelName)
    channelRef.current = channel

    channel.addEventListener('message', (event: MessageEvent<SlideMessage>) => {
      const data = event.data
      if (data.type === 'SLIDE_CHANGE' && optionsRef.current.onSlideChange) {
        optionsRef.current.onSlideChange(
          data.index,
          data.showHiddenSlides ?? false,
        )
      }
      if (data.type === 'SYNC_REQUEST' && optionsRef.current.onSyncRequest) {
        const current = optionsRef.current.onSyncRequest()
        channel.postMessage({
          type: 'SYNC_RESPONSE',
          ...current,
          source: 'audience',
        } satisfies SlideMessage)
      }
      if (data.type === 'SYNC_RESPONSE' && optionsRef.current.onSlideChange) {
        optionsRef.current.onSlideChange(
          data.index,
          data.showHiddenSlides ?? false,
        )
      }
    })

    return () => channel.close()
  }, [channelName])

  const sendSlideChange = useCallback(
    (
      index: number,
      source: 'audience' | 'presenter',
      showHiddenSlides = false,
    ) => {
      channelRef.current?.postMessage({
        type: 'SLIDE_CHANGE',
        index,
        showHiddenSlides,
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
