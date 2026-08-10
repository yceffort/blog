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

The `@yceffort/shared` package holds components used by both apps (Providers, MobileNav, EmphasizedTitle, SocialIcon, icons) and utilities (cookie, contact, title).

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

# Lint (oxlint, type-aware)
pnpm lint
pnpm lint:fix

# Format (oxfmt)
pnpm prettier
pnpm prettier:fix
```

## Deployment (Vercel)

This monorepo is deployed as two separate Vercel projects:

| Project  | Domain               | Root Directory  |
| -------- | -------------------- | --------------- |
| Blog     | yceffort.kr          | `apps/blog`     |
| Research | research.yceffort.kr | `apps/research` |

Both use `pnpm build` / `pnpm install` as build and install commands.

## Tech Stack

- **Runtime**: Node.js 24 (see `.nvmrc`)
- **Package Manager**: pnpm 11
- **Framework**: Next.js 16, React 19
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript 7
- **Lint/Format**: oxlint, oxfmt

## Author

yceffort <root@yceffort.kr>
