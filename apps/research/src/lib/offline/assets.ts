import type {OfflineDeck} from './types'

// Collecting and rewriting must visit the same places. If one side misses an
// attribute, the asset is saved but the slide keeps pointing at the network.
const MEDIA_SELECTOR = 'img, image, video, audio, source'
const URL_ATTRIBUTES = ['src', 'href', 'xlink:href', 'poster']
const CSS_URL = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi

function deckBase(deck: OfflineDeck, origin: string) {
  return new URL(`/slides/${encodeURIComponent(deck.slug)}`, origin)
}

function mapCssUrls(css: string, map: (url: string) => string) {
  return css.replace(CSS_URL, (match, double, single, bare) => {
    const original = double ?? single ?? bare
    const next = map(original)
    // Preserve quoting and escapes in data URLs and other unchanged values.
    return next === original ? match : `url("${next}")`
  })
}

// Marp places images in SVG foreignObjects and background images in inline CSS.
function mapDocumentUrls(document: Document, map: (url: string) => string) {
  for (const element of document.querySelectorAll(MEDIA_SELECTOR)) {
    for (const attribute of URL_ATTRIBUTES) {
      const value = element.getAttribute(attribute)
      if (value) element.setAttribute(attribute, map(value))
    }
    const srcset = element.getAttribute('srcset')
    if (srcset && !srcset.includes('data:'))
      element.setAttribute(
        'srcset',
        srcset
          .split(',')
          .map((candidate) => {
            const [url, ...descriptor] = candidate.trim().split(/\s+/)
            return [map(url), ...descriptor].join(' ')
          })
          .join(', '),
      )
  }
  for (const element of document.querySelectorAll('[style]'))
    element.setAttribute(
      'style',
      mapCssUrls(element.getAttribute('style') ?? '', map),
    )
  for (const element of document.querySelectorAll('style'))
    element.textContent = mapCssUrls(element.textContent ?? '', map)
}

// Inspect every slide, including slides the reader has never visited.
export function collectDeckAssets(deck: OfflineDeck, origin: string): string[] {
  const base = deckBase(deck, origin)
  const urls = new Set<string>()
  const add = (value: string) => {
    if (!value || /^(?:data:|blob:|#)/i.test(value)) {
      return value
    }
    const url = new URL(value, base)
    if (url.protocol !== 'https:' && url.origin !== origin) {
      throw new Error('HTTPS로 제공되지 않는 자료가 있어 저장할 수 없습니다.')
    }
    url.hash = ''
    urls.add(url.href)
    return value
  }
  mapDocumentUrls(
    new DOMParser().parseFromString(deck.html.join('\n'), 'text/html'),
    add,
  )
  mapCssUrls(deck.css, add)
  for (const font of deck.fonts) mapCssUrls(font, add)
  return [...urls].toSorted()
}

// Give each saved revision its own asset URLs. Two decks can keep different
// versions of the same source image without affecting each other or online pages.
export function rewriteDeckAssets(
  deck: OfflineDeck,
  origin: string,
  urls: Map<string, string>,
): OfflineDeck {
  const base = deckBase(deck, origin)
  const replace = (value: string) => {
    const url = new URL(value, base)
    const hash = url.hash
    url.hash = ''
    const local = urls.get(url.href)
    return local ? `${local}${hash}` : value
  }
  return {
    ...deck,
    css: mapCssUrls(deck.css, replace),
    fonts: deck.fonts.map((font) => mapCssUrls(font, replace)),
    html: deck.html.map((html) => {
      const document = new DOMParser().parseFromString(html, 'text/html')
      mapDocumentUrls(document, replace)
      return document.body.innerHTML
    }),
  }
}
