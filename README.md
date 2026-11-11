# Shop counter

A small in-memory shop built with Next.js (App Router): a cached server-rendered catalogue, a staff desk that records payments, and a checkout that charges a server-side snapshot of the cart.

Design notes are in [ARCHITECTURE.md](./ARCHITECTURE.md). The original brief is in [BRIEF.md](./BRIEF.md).

## Requirements

- Node.js 24 (see `.nvmrc`)
- pnpm 12

## Install

```bash
pnpm install
pnpm exec playwright install chromium   # once, for e2e tests
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm test` | Unit and component tests (Vitest + React Testing Library) |
| `pnpm test:e2e` | Playwright tests; builds and starts a production server on port 3100 |
| `pnpm lint` | ESLint |

Caching behaviour only applies to a production build, so check it with `pnpm build && pnpm start`.

## Where things are

- `validatePayment`: `src/lib/payments/validate-payment.ts`

## Time spent

_TODO_

## Not done

_TODO_

## AI tools

_TODO_
