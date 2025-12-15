import {ImageResponse} from 'next/og'

import {SiteConfig} from '@/config'

export const runtime = 'edge'

export async function GET(request: Request) {
  try {
    const {searchParams} = new URL(request.url)

    const title = searchParams.get('title')
    const description = searchParams.get('description')
    const tagsParam = searchParams.get('tags')
    const pathParam = searchParams.get('path')

    if (!title) {
      return new Response('Missing title', {status: 400})
    }

    const address = pathParam ? `${SiteConfig.url}${pathParam}` : SiteConfig.url
    const tags = tagsParam ? tagsParam.split(',') : []

    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host')
    const baseUrl = `${protocol}://${host}`

    const imageUrl = `${baseUrl}/og-background.jpg`

    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageUrl}`)
    }
    const imageBuffer = await imageRes.arrayBuffer()
    const imageBase64 = Buffer.from(imageBuffer).toString('base64')

    const fontUrl =
      'https://cdn.jsdelivr.net/gh/fonts-archive/NanumGothic/NanumGothicBold.ttf'

    const fontRes = await fetch(fontUrl)
    if (!fontRes.ok) {
      throw new Error(`Failed to fetch font: ${fontUrl}`)
    }
    const fontData = await fontRes.arrayBuffer()

    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          position: 'relative',
          backgroundColor: 'black',
          fontFamily: '"NanumGothic"',
        }}
      >
        <img
          alt={title}
          src={`data:image/jpeg;base64,${imageBase64}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(3px)',
            transform: 'scale(1.02)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            alignItems: 'flex-start',
            justifyContent: 'center',
            position: 'relative',
            padding: '50px 70px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.2,
              color: '#fff',
              textAlign: 'left',
              wordBreak: 'keep-all',
              letterSpacing: '-0.03em',
              marginBottom: 8,
              justifyContent: 'flex-start',
              textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
              width: '100%',
            }}
          >
            {title}
          </div>

          {description ? (
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                fontWeight: 400,
                color: '#eee',
                lineHeight: 1.4,
                textAlign: 'left',
                wordBreak: 'keep-all',
                letterSpacing: '-0.02em',
                marginBottom: 16,
                maxWidth: '90%',
                justifyContent: 'flex-start',
                textShadow: '1px 1px 6px rgba(0,0,0,0.7)',
                width: '100%',
              }}
            >
              {description.length > 80
                ? description.slice(0, 80) + '...'
                : description}
            </div>
          ) : null}

          {tags.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'flex-start',
                gap: '10px',
                marginBottom: 20,
                maxWidth: '90%',
                width: '100%',
              }}
            >
              {tags.map((tag, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '15px',
                    padding: '8px 15px',
                    fontSize: 22,
                    color: '#fff',
                    textShadow: '1px 1px 4px rgba(0,0,0,0.6)',
                    fontWeight: 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  #{tag}
                </div>
              ))}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              fontSize: 26,
              fontWeight: 700,
              color: '#fff',
              marginTop: 10,
              paddingTop: 16,
              width: '100%',
              justifyContent: 'flex-start',
              textShadow: '1px 1px 6px rgba(0,0,0,0.7)',
              borderTop: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            {address}
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'NanumGothic',
            data: fontData,
            style: 'normal',
            weight: 700,
          },
        ],
      },
    )
  } catch (e: unknown) {
    return new Response(
      `Failed to generate the image: ${e instanceof Error ? e.message : 'Unknown error'}`,
      {
        status: 500,
      },
    )
  }
}
