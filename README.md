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

## Development

```bash
# Install dependencies
pnpm install

# Run blog dev server
pnpm dev:blog

# Run research dev server
pnpm dev:research

# Build blog
pnpm build:blog

# Build research
pnpm build:research

# Lint all projects
pnpm lint
```

## Deployment (Vercel)

This monorepo is deployed as two separate Vercel projects:

### Blog (yceffort.kr)
- **Root Directory**: `apps/blog`
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`

### Research (research.yceffort.kr)
- **Root Directory**: `apps/research`
- **Build Command**: `pnpm build`
- **Install Command**: `pnpm install`

## Tech Stack

- **Runtime**: Node.js 22.12.0
- **Package Manager**: pnpm 10.6.5
- **Framework**: Next.js 16
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 5

## Author

yceffort <root@yceffort.kr>
