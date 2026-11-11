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

About 10 hours.

## Not done

Nothing from the brief is missing.

## AI tools

I used **Claude Code** (Claude Opus) as a pair programmer in the repo. I directed the work, made the decisions and reviewed what it produced.

- **My part:**
  - set up the working rules in `CLAUDE.md`: the brief is followed literally, pnpm only, small Conventional Commits
  - added the lefthook and commitlint gates
  - made every call where the brief is open: the list in ARCHITECTURE.md, such as replay beating sold out, `lamp` being `invalid_cart` at checkout, and the cart clearing after an order
  - chose the build order and asked for reviews at each stage
- **Claude's part:**
  - the scaffold, implementation and tests
  - reading the bundled Next 16 docs for the caching APIs
  - a review pass that found the cache-invalidation e2e test passed even with `revalidateTag` removed
  - drafts of ARCHITECTURE.md and this README

**Where I disagreed:**

- **The Not done list.** Claude proposed three items: no screen reader testing, pages that need JavaScript, and a timing edge case in the URL search. None of them are brief requirements, and the brief asks for that list only for what is missing, so listing them would wrongly suggest the work was unfinished. They are limitations and belong in ARCHITECTURE.md.
- **Scope.** Early on it raised limitations to handle beyond the brief. I made "follow the brief literally, add no rules it does not state" a project rule. For example, the email is trimmed but the charge id is not, because the brief only says to trim the email.
- **Sold-out preview.** Its first recommendation was 409, to match record. The brief's preview section says a failure answers 400, and 409 is only stated for record, so I went with 400.
- **Commits.** I made sure Claude followed the git guidelines I set: Conventional Commits, one logical step per commit, and every commit passing lint, typecheck and tests. When its history got too granular, I had it squash the commits into one per logical step.
