# Shop counter

@AGENTS.md

Take-home project. Requirements live in `BRIEF.md`; read it before changing behaviour.

## Following the brief

`BRIEF.md` is the spec and is followed literally.

- Do not add rules, normalisation or limits it does not state. Example: it trims the email but not the charge id, so the charge id is not trimmed.
- Copy every user-facing string, label, error message, status code and JSON shape exactly.
- Where the brief is silent, pick the simplest behaviour consistent with it, and record the choice in `ARCHITECTURE.md` so it can be defended.
- If two of its rules conflict, flag it to the user rather than silently choosing.

## Next.js docs

This project uses Next.js 16, which differs from older versions. Before writing code that uses a Next.js API, read the matching guide in `node_modules/next/dist/docs/` (`01-app/` is the App Router). This matters most for caching (`use cache`, `cacheTag`, `revalidateTag`, `updateTag`), `searchParams`, `generateMetadata` and `notFound`.

## Stack

- Next.js (App Router), React, TypeScript, Tailwind CSS
- react-hook-form + zod for forms and validation
- Vitest + React Testing Library for unit/component tests
- Playwright for end-to-end tests (runs against a production build)
- Package manager: **pnpm** only. Never use npm or yarn, and never commit another lockfile.
- Node version: see `.nvmrc`.

## Commands

- `pnpm dev`: start dev server
- `pnpm build` / `pnpm start`: production build and serve
- `pnpm test`: unit and component tests (Vitest)
- `pnpm test:e2e`: Playwright tests
- `pnpm lint`: ESLint
- `pnpm typecheck`: TypeScript, no emit

## Definition of done (before each commit)

- `pnpm lint`, `pnpm typecheck` and `pnpm test` pass. The lefthook `pre-commit` hook runs all three.
- Changes to pages, route handlers or caching: `pnpm test:e2e` also passes.

## Git hooks (lefthook)

Installed automatically by `pnpm install` (the `prepare` script). Config: `lefthook.yml`.

- `pre-commit`: lint, typecheck, unit tests
- `commit-msg`: commitlint with `commitlint.config.mjs`, which enforces the format below and rejects AI attribution

If a hook fails, fix the cause and commit again. Never bypass hooks with `--no-verify`.

## Git commits

Follow [Conventional Commits](https://www.conventionalcommits.org/). The history is part of the submission, so it must read as a clear story of how the project was built.

### One step, one commit

- Commit each logical step separately, e.g. store, then validation, then API route, then UI. Never bundle unrelated changes.
- Each commit should leave the project in a working state (builds, tests pass).
- Tests may go in the same commit as the code they cover, or in a `test:` commit right after.
- Do not batch a whole feature into a single commit at the end.

### Message format

```
<type>(<optional scope>): <summary>

<optional body: why, not what, wrapped at 72 chars>
```

- **Types:** `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `build`, `ci`, `style`, `perf`
- **Scopes (optional):** `shop`, `desk`, `checkout`, `catalog`, `payments`, `store`, `e2e`, `a11y`, `deps`
- **Summary:** imperative mood ("add", not "added"/"adds"), starts lowercase, no trailing period. Aim for ~50 characters; the hook rejects headers over 72. Code identifiers like `validatePayment` are fine.
- **Body:** only when the reason is not obvious from the summary. Keep it short and wrap lines at 72 characters.

### Examples

```
chore: scaffold next.js app with tailwind
feat(store): add in-memory catalogue store
feat(payments): add shared validatePayment
test(payments): cover cushion on lamp rejection
feat(shop): cache catalogue reads with tags
fix(shop): return 404 for unknown sku
docs: explain caching choice in architecture
```

### Don't

- Add `Co-Authored-By` or any AI attribution trailer/footer to commits or PRs
- Vague messages: "update", "fix stuff", "wip", "changes"
- Mixing refactors with features in one commit
- Committing generated files, `.env*`, `node_modules`, `.next`, test reports
