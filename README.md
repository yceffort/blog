# yceffort-monorepo

A monorepo containing yceffort's blog and research projects.

## Structure

```
├── apps/
│   ├── blog/          # Main blog (yceffort.kr)
│   └── research/      # Research slides (research.yceffort.kr)
├── packages/
│   └── shared/        # Shared components and utilities
└── package.json       # Root workspace configuration
```

## Shared Package

The `@yceffort/shared` package contains reusable components:

- **Providers** - ThemeProvider wrapper
- **ThemeSwitch** - Theme selector (Light/Dark/System)
- **SocialIcon** - Social media link icons
- **Icons** - Theme icons (Sun, Moon, Monitor) and social icons

## Development

```bash
# Install dependencies
pnpm install

# Run both dev servers (blog: 3000, research: 3001)
pnpm dev

# Run individual dev servers
pnpm dev:blog      # http://localhost:3000
pnpm dev:research  # http://localhost:3001

# Build
pnpm build:blog
pnpm build:research

# Lint all projects
pnpm lint
```

## Deployment (Vercel)

This monorepo is deployed as two separate Vercel projects:

### Blog (yceffort.kr)

| Setting | Value |
|---------|-------|
| Root Directory | `apps/blog` |
| Build Command | `pnpm build` |
| Install Command | `pnpm install` |

### Research (research.yceffort.kr)

| Setting | Value |
|---------|-------|
| Root Directory | `apps/research` |
| Build Command | `pnpm build` |
| Install Command | `pnpm install` |

## Tech Stack

- **Runtime**: Node.js 24.12.0
- **Package Manager**: pnpm 10.6.5
- **Framework**: Next.js 16
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5

## Author

yceffort <root@yceffort.kr>
