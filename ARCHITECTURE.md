# Architecture

## Server and client split per route

## Caching the shop pages

## Why the charge is the server snapshot

## Running on several serverless instances

## Accessibility checks

## Choices where the brief is open

- **Order of checks when recording:** validate, then replay, then stock. A replay returns the original payment even if the rest of the body differs, as the brief's "original sku and total" implies.
- **Replay after sell-out:** a known charge id still answers 200 with the original payment, not 409. A retry of a payment that already went through should never fail, and it takes no stock either way.
- **Preview of a sold-out item:** 400 with `{ sku: "Sold out" }`. The preview section says "a failure answers HTTP 400"; 409 is stated only for record.
- **Body that is not a JSON object:** treated as an empty form, so it answers 400 with every required field listed.
- **Desk items at checkout:** `lamp` and `stool` count as unknown skus for `begin`, because checkout sells only Field notebook, Gel pen and Slip case. Otherwise checkout could sell stock-limited items without taking them off stock.
- **Quantity at checkout:** anything other than a whole number of 1 or more, including `1.5` or `"2"`, is `invalid_cart`.
- **Status codes the brief leaves out:** `begin` and `complete` answer 200. An unknown or missing `attemptId` answers 404 `{ "error": "unknown_attempt" }`.
- **Duplicate skus in `begin`:** kept as separate lines. The cart page never sends them.
- **Decrease at quantity 1:** removes the line, the same as Remove. Focus moves to that row's Add button.
- **Pay pressed again:** starts a new attempt from the live cart, which replaces the one shown.
- **After Order placed:** the cart is cleared and Payment in progress is replaced by the order.

## Project setup

I scaffolded the app with `create-next-app` (Next.js 16, App Router, TypeScript, Tailwind, `src/` folder) and use pnpm. Node 24 is pinned in `.nvmrc` and `engines`. `.gitattributes` forces LF line endings because I work on Windows.

- **Unit and component tests:** Vitest with React Testing Library in jsdom. `pnpm test` runs once and exits, so a reviewer can run it without a watcher.
- **End-to-end tests:** Playwright on Chromium. `pnpm test:e2e` runs `next build` and `next start` on port 3100 and never reuses a running server. Caching only behaves for real in a production build, and a fresh server means the in-memory store starts clean on every run. `@axe-core/playwright` is installed for the accessibility scan.
- **Commit gates (lefthook):** `pre-commit` runs lint, typecheck and unit tests. `commit-msg` runs commitlint with Conventional Commits, a 72-character header and a custom rule that rejects AI attribution trailers. The commit history is part of the submission, so I wanted every commit to be small, readable and passing. `pnpm install` installs the hooks through the `prepare` script.
- **AI assistant guidance:** `CLAUDE.md` holds the project rules: pnpm only, the commit format, and what "done" means before a commit. It imports `AGENTS.md`, the file Next.js generates telling assistants to read the bundled Next 16 docs instead of relying on older APIs. Caching is where that matters most.
