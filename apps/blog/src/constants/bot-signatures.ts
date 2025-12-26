import {isbot} from 'isbot'

export type BotCategory =
  | 'ai'
  | 'search'
  | 'social'
  | 'seo'
  | 'feed'
  | 'tool'
  | 'unknown'

const BOT_CATEGORIES: Record<string, {name: string; category: BotCategory}> = {
  // AI Crawlers
  gptbot: {name: 'openai', category: 'ai'},
  chatgpt: {name: 'openai', category: 'ai'},
  claudebot: {name: 'anthropic', category: 'ai'},
  'claude-web': {name: 'anthropic', category: 'ai'},
  bytespider: {name: 'bytedance', category: 'ai'},
  amazonbot: {name: 'amazon', category: 'ai'},
  perplexitybot: {name: 'perplexity', category: 'ai'},
  'google-extended': {name: 'google-ai', category: 'ai'},
  cohere: {name: 'cohere', category: 'ai'},

  // Search Engines
  googlebot: {name: 'google', category: 'search'},
  bingbot: {name: 'bing', category: 'search'},
  duckduckbot: {name: 'duckduckgo', category: 'search'},
  yandex: {name: 'yandex', category: 'search'},
  baidu: {name: 'baidu', category: 'search'},
  naver: {name: 'naver', category: 'search'},
  yeti: {name: 'naver', category: 'search'},

  // Social Media
  facebookexternalhit: {name: 'facebook', category: 'social'},
  twitterbot: {name: 'twitter', category: 'social'},
  linkedinbot: {name: 'linkedin', category: 'social'},
  slackbot: {name: 'slack', category: 'social'},
  discordbot: {name: 'discord', category: 'social'},
  telegrambot: {name: 'telegram', category: 'social'},
  whatsapp: {name: 'whatsapp', category: 'social'},

  // SEO Tools
  ahrefsbot: {name: 'ahrefs', category: 'seo'},
  semrushbot: {name: 'semrush', category: 'seo'},
  mj12bot: {name: 'majestic', category: 'seo'},

  // Feed Readers
  feedly: {name: 'feedly', category: 'feed'},
  feedbin: {name: 'feedbin', category: 'feed'},

  // Automation Tools
  headlesschrome: {name: 'headless', category: 'tool'},
  puppeteer: {name: 'puppeteer', category: 'tool'},
  playwright: {name: 'playwright', category: 'tool'},
  selenium: {name: 'selenium', category: 'tool'},
}

function getCategoryInfo(userAgent: string): {
  name: string
  category: BotCategory
} {
  const ua = userAgent.toLowerCase()

  for (const [signature, info] of Object.entries(BOT_CATEGORIES)) {
    if (ua.includes(signature)) {
      return info
    }
  }

  return {name: 'other', category: 'unknown'}
}

export function detectBot(userAgent: string): {
  isBot: boolean
  botName: string
  botCategory: BotCategory
} {
  if (!userAgent) {
    return {isBot: true, botName: 'empty-ua', botCategory: 'unknown'}
  }

  if (isbot(userAgent)) {
    const {name, category} = getCategoryInfo(userAgent)
    return {isBot: true, botName: name, botCategory: category}
  }

  return {isBot: false, botName: 'human', botCategory: 'unknown'}
}
