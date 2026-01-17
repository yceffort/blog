'use client'

import Image from 'next/image'
import {useState, useCallback, useEffect, useRef} from 'react'
// @ts-expect-error - react-dom types issue with React 19
import {createPortal} from 'react-dom'

interface ImageZoomProps {
  src: string
  alt: string
  width: number
  height: number
  isExternal?: boolean
}

export default function ImageZoom({
  src,
  alt,
  width,
  height,
  isExternal,
}: ImageZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const imageRef = useRef<HTMLSpanElement>(null)
  const [imageRect, setImageRect] = useState<DOMRect | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const handleOpen = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    if (imageRef.current) {
      setImageRect(imageRef.current.getBoundingClientRect())
    }
    setIsZoomed(true)
    requestAnimationFrame(() => {
      setIsAnimating(true)
    })
  }, [])

  const handleClose = useCallback(() => {
    setIsAnimating(false)
    closeTimeoutRef.current = setTimeout(() => {
      setIsZoomed(false)
      setImageRect(null)
      closeTimeoutRef.current = null
    }, 300)
  }, [])

  useEffect(() => {
    if (!isZoomed) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isZoomed, handleClose])

  const calculateTransform = () => {
    if (!imageRect) {
      return {}
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const padding = 40

    const maxWidth = viewportWidth - padding * 2
    const maxHeight = viewportHeight - padding * 2

    const aspectRatio = width / height
    let targetWidth = maxWidth
    let targetHeight = targetWidth / aspectRatio

    if (targetHeight > maxHeight) {
      targetHeight = maxHeight
      targetWidth = targetHeight * aspectRatio
    }

    const scale = targetWidth / imageRect.width

    const imageCenterX = imageRect.left + imageRect.width / 2
    const imageCenterY = imageRect.top + imageRect.height / 2
    const viewportCenterX = viewportWidth / 2
    const viewportCenterY = viewportHeight / 2

    const translateX = viewportCenterX - imageCenterX
    const translateY = viewportCenterY - imageCenterY

    return {
      transform: isAnimating
        ? `translate(${translateX}px, ${translateY}px) scale(${scale})`
        : 'translate(0, 0) scale(1)',
    }
  }

  const ImageComponent = isExternal ? (
    <img src={src} alt={alt} width={width} height={height} />
  ) : (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      placeholder="empty"
      crossOrigin="anonymous"
    />
  )

  return (
    <>
      <span
        ref={imageRef}
        onClick={handleOpen}
        className="block cursor-zoom-in"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleOpen()
          }
        }}
      >
        {ImageComponent}
      </span>

      {mounted &&
        isZoomed &&
        createPortal(
          <div className="fixed inset-0 z-[9999]" onClick={handleClose}>
            <div
              className={`absolute inset-0 bg-black transition-opacity duration-300 ${
                isAnimating ? 'opacity-90' : 'opacity-0'
              }`}
            />

            {imageRect && (
              <div
                className="absolute transition-transform duration-300 ease-out"
                style={{
                  left: imageRect.left,
                  top: imageRect.top,
                  width: imageRect.width,
                  height: imageRect.height,
                  ...calculateTransform(),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="cursor-zoom-out" onClick={handleClose}>
                  {ImageComponent}
                </div>
              </div>
            )}

            <button
              className={`absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-opacity duration-300 hover:bg-white/20 ${
                isAnimating ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={handleClose}
              aria-label="Close"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
