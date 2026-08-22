import {Marp as MarpCore} from '@marp-team/marp-core'
import markdownItCjkFriendly from 'markdown-it-cjk-friendly'
import postcss from 'postcss'
import type {Result as PostCSSResult, AtRule} from 'postcss'
import postcssImportUrl from 'postcss-import-url'

import {parsePresenterNotes} from './parsePresenterNotes'
import {midnightTheme} from './themes/midnight'
import {yceffortTheme} from './themes/yceffort'

const postcssStripFontFace = Object.assign(
  () => ({
    postcssPlugin: 'marp-strip-font-face',
    AtRule: (
      rule: AtRule,
      {result}: {result: PostCSSResult & {fonts?: AtRule[]}},
    ) => {
      if (rule.name === 'font-face') {
        if (!result.fonts) {
          result.fonts = []
        }
        result.fonts.push(rule)
        rule.remove()
      }
    },
  }),
  {postcss: true as const},
)

interface RenderedMarp {
  markdown: string
  html: string[]
  css: string
  fonts: string[]
  notes: string[]
}

const marpCache = new Map<string, Promise<RenderedMarp>>()

export function generateRenderedMarp(markdown: string): Promise<RenderedMarp> {
  const cached = marpCache.get(markdown)
  if (cached) {
    return cached
  }
  const pending = renderMarp(markdown)
  marpCache.set(markdown, pending)
  return pending
}

async function renderMarp(markdown: string): Promise<RenderedMarp> {
  const marp = new MarpCore({
    container: false,
    script: false,
    printable: false,
  })

  // 한글처럼 띄어쓰기 없이 구두점과 붙는 텍스트에서 **강조**가 리터럴로 노출되는
  // CommonMark flanking 규칙 문제를 구제한다. blog의 remark-cjk-friendly와 같은 프로젝트다.
  marp.use(markdownItCjkFriendly)

  // mermaid 펜스는 서버에서 파싱하지 않고 placeholder만 남긴다.
  // 실제 렌더는 클라이언트(Marp.tsx)가 textContent를 읽어 수행한다.
  marp.use((md) => {
    const defaultFence = md.renderer.rules.fence
    md.renderer.rules.fence = (
      tokens: {info: string; content: string}[],
      idx: number,
      options: unknown,
      env: unknown,
      slf: unknown,
    ) => {
      const token = tokens[idx]
      if (token.info.trim() === 'mermaid') {
        return `<div class="mermaid">${md.utils.escapeHtml(token.content.trim())}</div>`
      }
      return defaultFence(tokens, idx, options, env, slf)
    }
  })

  marp.themeSet.add(yceffortTheme)
  marp.themeSet.add(midnightTheme)

  const {html, css} = marp.render(markdown, {htmlAsArray: true})

  const result = await postcss()
    .use(postcssImportUrl)
    .use(postcssStripFontFace)
    .process(css, {from: undefined})

  const typedResult = result as PostCSSResult & {fonts?: AtRule[]}
  const fonts: string[] = (typedResult.fonts || []).map((font) =>
    font.toString(),
  )
  const notes = parsePresenterNotes(markdown)

  return {
    markdown,
    html,
    css: result.css,
    fonts,
    notes,
  }
}
