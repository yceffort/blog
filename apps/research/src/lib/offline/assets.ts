import type {OfflineDeck} from './types'

// Marp places images in SVG foreignObjects and background images in inline CSS.
// Inspect every slide, including slides the reader has never visited.
export function collectDeckAssets(deck: OfflineDeck, origin: string): string[] {
  const base = new URL(`/slides/${encodeURIComponent(deck.slug)}`, origin)
  const urls = new Set<string>()
  function add(value: string) {
    if (!value || /^(?:data:|blob:|#)/i.test(value)) {
      return
    }
    const url = new URL(value, base)
    if (url.protocol !== 'https:' && url.origin !== origin) {
      throw new Error('HTTPS로 제공되지 않는 자료가 있어 저장할 수 없습니다.')
    }
    url.hash = ''
    urls.add(url.href)
  }
  function collectCss(css: string) {
    for (const match of css.matchAll(
      /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi,
    )) {
      add(match[1] ?? match[2] ?? match[3])
    }
  }
  const document = new DOMParser().parseFromString(
    deck.html.join('\n'),
    'text/html',
  )
  for (const element of document.querySelectorAll(
    'img, image, video, audio, source',
  )) {
    for (const attribute of ['src', 'href', 'xlink:href', 'poster']) {
      const value = element.getAttribute(attribute)
      if (value) add(value)
    }
    const srcset = element.getAttribute('srcset')
    if (srcset && !srcset.includes('data:')) {
      for (const candidate of srcset.split(',')) {
        add(candidate.trim().split(/\s+/)[0])
      }
    }
  }
  for (const element of document.querySelectorAll('[style]')) {
    collectCss(element.getAttribute('style') ?? '')
  }
  for (const element of document.querySelectorAll('style')) {
    collectCss(element.textContent ?? '')
  }
  collectCss(deck.css)
  for (const font of deck.fonts) collectCss(font)
  return [...urls].toSorted()
}

// Give each saved revision its own asset URLs. Two decks can keep different
// versions of the same source image without affecting each other or online pages.
export function rewriteDeckAssets(
  deck: OfflineDeck,
  origin: string,
  urls: Map<string, string>,
): OfflineDeck {
  const base = new URL(`/slides/${encodeURIComponent(deck.slug)}`, origin)
  const replace = (value: string) => {
    const url = new URL(value, base)
    const hash = url.hash
    url.hash = ''
    const local = urls.get(url.href)
    return local ? `${local}${hash}` : value
  }
  const css = (value: string) =>
    value.replace(
      /url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi,
      (_match, double, single, bare) =>
        `url("${replace(double ?? single ?? bare)}")`,
    )
  return {
    ...deck,
    css: css(deck.css),
    fonts: deck.fonts.map(css),
    html: deck.html.map((html) => {
      const document = new DOMParser().parseFromString(html, 'text/html')
      for (const element of document.querySelectorAll(
        'img, image, video, audio, source',
      )) {
        for (const attribute of ['src', 'href', 'xlink:href', 'poster']) {
          const value = element.getAttribute(attribute)
          if (value) element.setAttribute(attribute, replace(value))
        }
        const srcset = element.getAttribute('srcset')
        if (srcset && !srcset.includes('data:'))
          element.setAttribute(
            'srcset',
            srcset
              .split(',')
              .map((candidate) => {
                const [url, ...descriptor] = candidate.trim().split(/\s+/)
                return [replace(url), ...descriptor].join(' ')
              })
              .join(', '),
          )
      }
      for (const element of document.querySelectorAll('[style]'))
        element.setAttribute('style', css(element.getAttribute('style') ?? ''))
      for (const element of document.querySelectorAll('style'))
        element.textContent = css(element.textContent ?? '')
      return document.body.innerHTML
    }),
  }
}
