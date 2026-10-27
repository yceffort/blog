import type {FeedSource} from '../types'

export const RSS_FEEDS: FeedSource[] = [
  {group: 'vendor', name: 'Lobsters', url: 'https://lobste.rs/rss'},
  {
    group: 'vendor',
    name: 'Chromium Blog',
    url: 'https://blog.chromium.org/feeds/posts/default',
  },
  {group: 'vendor', name: 'V8 Blog', url: 'https://v8.dev/blog.atom'},
  {group: 'vendor', name: 'web.dev', url: 'https://web.dev/feed.xml'},
  {
    group: 'vendor',
    name: 'Chrome Developers',
    url: 'https://developer.chrome.com/blog/feed.xml',
  },
  {
    group: 'vendor',
    name: 'Node.js Blog',
    url: 'https://nodejs.org/en/feed/blog.xml',
  },
  {group: 'vendor', name: 'GitHub Blog', url: 'https://github.blog/feed/'},
  {group: 'vendor', name: 'Vercel Blog', url: 'https://vercel.com/atom'},
  {group: 'vendor', name: 'WebKit Blog', url: 'https://webkit.org/feed/'},
  {
    group: 'vendor',
    name: 'Grafana Labs',
    url: 'https://grafana.com/blog/index.xml',
  },
  {
    group: 'vendor',
    name: 'Socket',
    url: 'https://socket.dev/api/blog/feed.atom',
  },
  {
    group: 'vendor',
    name: 'Platformatic',
    url: 'https://blog.platformatic.dev/rss.xml',
  },

  {group: 'framework', name: 'React', url: 'https://react.dev/rss.xml'},
  {group: 'framework', name: 'Next.js', url: 'https://nextjs.org/feed.xml'},
  {group: 'framework', name: 'Astro', url: 'https://astro.build/rss.xml'},
  {group: 'framework', name: 'Bun', url: 'https://bun.sh/rss.xml'},
  {group: 'framework', name: 'Deno', url: 'https://deno.com/feed'},
  {group: 'framework', name: 'Vite', url: 'https://vite.dev/blog.rss'},
  {group: 'framework', name: 'pnpm', url: 'https://pnpm.io/blog/rss.xml'},
  {
    group: 'framework',
    name: 'TypeScript',
    url: 'https://devblogs.microsoft.com/typescript/feed/',
  },
  {
    group: 'framework',
    name: 'Rust Blog',
    url: 'https://blog.rust-lang.org/feed.xml',
  },
  {group: 'framework', name: 'Oxc', url: 'https://oxc.rs/feeds/blog-en.rss'},
  {
    group: 'framework',
    name: 'OpenTelemetry',
    url: 'https://opentelemetry.io/blog/index.xml',
  },
  {
    group: 'framework',
    name: 'Kubernetes Blog',
    url: 'https://kubernetes.io/feed.xml',
  },

  {
    group: 'personal',
    name: 'Dan Abramov',
    url: 'https://overreacted.io/rss.xml',
  },
  {
    group: 'personal',
    name: 'Josh Comeau',
    url: 'https://www.joshwcomeau.com/rss.xml',
  },
  {group: 'personal', name: 'Lea Verou', url: 'https://lea.verou.me/feed/'},
  {
    group: 'personal',
    name: 'Simon Willison',
    url: 'https://simonwillison.net/atom/everything/',
  },
  {
    group: 'personal',
    name: 'Matt Pocock',
    url: 'https://www.totaltypescript.com/rss.xml',
  },
  {
    group: 'personal',
    name: 'Jake Archibald',
    url: 'https://jakearchibald.com/posts.rss',
  },
  {
    group: 'personal',
    name: 'Addy Osmani',
    url: 'https://addyosmani.com/rss.xml',
  },
  {group: 'personal', name: 'Anthony Fu', url: 'https://antfu.me/feed.xml'},
  {
    group: 'personal',
    name: 'Kent C. Dodds',
    url: 'https://kentcdodds.com/blog/rss.xml',
  },
  {
    group: 'personal',
    name: 'Nolan Lawson',
    url: 'https://nolanlawson.com/feed/',
  },
  {
    group: 'personal',
    name: 'Chris Coyier',
    url: 'https://chriscoyier.net/feed/',
  },
  {group: 'personal', name: 'Dan Luu', url: 'https://danluu.com/atom.xml'},
  {group: 'personal', name: 'Julia Evans', url: 'https://jvns.ca/atom.xml'},
  {
    group: 'personal',
    name: 'Martin Fowler',
    url: 'https://martinfowler.com/feed.atom',
  },
  {
    group: 'personal',
    name: 'Josh Goldberg',
    url: 'https://www.joshuakgoldberg.com/rss.xml',
  },
  {
    group: 'personal',
    name: 'Ryan Carniato',
    url: 'https://dev.to/feed/ryansolid',
  },
  {group: 'personal', name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/'},
  {
    group: 'personal',
    name: 'Frontend Masters',
    url: 'https://frontendmasters.com/blog/feed/',
  },
  {
    group: 'personal',
    name: 'The Pragmatic Engineer',
    url: 'https://newsletter.pragmaticengineer.com/feed',
  },
  {
    group: 'personal',
    name: 'Kent Beck',
    url: 'https://tidyfirst.substack.com/feed',
  },
  {
    group: 'personal',
    name: 'The Engineering Manager',
    url: 'https://www.theengineeringmanager.com/feed/',
  },
  {group: 'personal', name: 'antirez', url: 'https://antirez.com/rss'},
  {group: 'personal', name: 'Charity Majors', url: 'https://charity.wtf/feed/'},
  {group: 'personal', name: 'Fred Hebert', url: 'https://ferd.ca/feed.rss'},
  {
    group: 'personal',
    name: 'matklad',
    url: 'https://matklad.github.io/feed.xml',
  },
  {
    group: 'personal',
    name: 'Hillel Wayne',
    url: 'https://buttondown.com/hillelwayne/rss',
  },
  {
    group: 'personal',
    name: 'Geoffrey Litt',
    url: 'https://www.geoffreylitt.com/feed.xml',
  },
  {
    group: 'personal',
    name: 'Harry Roberts',
    url: 'https://csswizardry.com/feed.xml',
  },
  {
    group: 'personal',
    name: 'Alex Russell',
    url: 'https://infrequently.org/feed/',
  },
  {
    group: 'personal',
    name: 'Philip Walton',
    url: 'https://philipwalton.com/atom.xml',
  },
  {
    group: 'personal',
    name: 'Barry Pollard',
    url: 'https://www.tunetheweb.com/rss.xml',
  },

  {
    group: 'company',
    name: 'Cloudflare',
    url: 'https://blog.cloudflare.com/rss/',
  },
  {
    group: 'company',
    name: 'Stack Overflow',
    url: 'https://stackoverflow.blog/feed/',
  },
  {
    group: 'company',
    name: 'Google Developers',
    url: 'https://developers.googleblog.com/feeds/posts/default',
  },

  {
    group: 'release',
    name: 'Node.js releases',
    url: 'https://github.com/nodejs/node/releases.atom',
  },
  {
    group: 'release',
    name: 'esbuild releases',
    url: 'https://github.com/evanw/esbuild/releases.atom',
  },
  {
    group: 'release',
    name: 'Playwright releases',
    url: 'https://github.com/microsoft/playwright/releases.atom',
  },
  {
    group: 'release',
    name: 'TC39 proposals',
    url: 'https://github.com/tc39/proposals/commits/main.atom',
  },

  {
    group: 'standard',
    name: 'Mozilla Hacks',
    url: 'https://hacks.mozilla.org/feed/',
  },
  {
    group: 'standard',
    name: 'MDN Blog',
    url: 'https://developer.mozilla.org/en-US/blog/rss.xml',
  },

  {
    group: 'newsletter',
    name: 'JavaScript Weekly',
    url: 'https://javascriptweekly.com/rss',
  },
  {
    group: 'newsletter',
    name: 'Frontend Focus',
    url: 'https://frontendfoc.us/rss',
  },
  {group: 'newsletter', name: 'Node Weekly', url: 'https://nodeweekly.com/rss'},
]

export const NEWSLETTERS = new Set(
  RSS_FEEDS.filter((f) => f.group === 'newsletter').map((f) => f.name),
)

export const PERSONAL_BLOGS = new Set(
  RSS_FEEDS.filter((f) => f.group === 'personal').map((f) => f.name),
)

export const HN_TOP_COUNT = 30
export const HN_MIN_SCORE = 50

export const USER_AGENT = 'news-bot/1.0 (+https://github.com/yceffort/blog)'
export const FETCH_TIMEOUT_MS = 20_000
// 개인 블로그와 프레임워크 블로그는 매일 글을 쓰지 않는다. 36시간 창에서는 이들이
// 구조적으로 배제된다(실측: 36시간에 개인 2건 프레임워크 0건, 7일에 25건과 5건).
// 창을 넓히고 재등장은 seen-urls.json이 막는다.
export const RECENT_WINDOW_HOURS = 168
export const SHORTLIST_SIZE = 30
export const CONTENT_MAX_CHARS = 12_000
export const SEEN_RETENTION_DAYS = 60
