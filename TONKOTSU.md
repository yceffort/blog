# REPO CONTEXT
This file contains important context about this repo for [Tonkotsu](https://www.tonkotsu.ai) and helps it work faster and generate better code.

## Initial Setup

```bash
# Install dependencies using pnpm
pnpm install
```

## Build Command

```bash
pnpm build
```

## Lint Commands

```bash
# Lint JavaScript/TypeScript files
pnpm lint

# Fix JavaScript/TypeScript linting issues
pnpm lint:fix

# Lint CSS/SCSS files
pnpm lint:style

# Fix CSS/SCSS linting issues
pnpm lint:style:fix

# Lint Markdown files
pnpm md

# Fix Markdown linting issues
pnpm md:fix

# Check formatting
pnpm prettier

# Fix formatting issues
pnpm prettier:fix
```

## Test Commands

This repository doesn't appear to have dedicated test commands or testing framework setup.

## Development Server

```bash
pnpm dev
```

## Production Server

```bash
pnpm start
```

## Tech Stack

- Node.js v22.12.0
- React v19.x
- Next.js v15.x
- TypeScript v5.x
- TailwindCSS v4.x
- MDX (next-mdx-remote v5.x)
- Package Manager: pnpm v10.6.5
- Deployment: Vercel