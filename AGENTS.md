<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Dev loop

- With `pnpm dev` running, check the app through the dev server's MCP endpoint `/_next/mcp` (`next-devtools-mcp`): `get_errors`, `get_compilation_issues`, `compile_route`. Use these while editing instead of `next build`.
- If the browser half of a hydration diff has code that is not in `src`, the browser is running stale JS (a service worker or cache on localhost:3000). Confirm in a fresh headless browser before changing code.
- Dev runs on 3000 and e2e on 3100, so both can run at once.

## UI

- Classes come from `src/app/ui.ts`, imported as `import * as ui from "@/app/ui"`. When a class string repeats, add an export. Never stack a second colour on a shared class (e.g. `${ui.card} border-green-200`); add a variant instead.
- One light theme: no `dark:` classes. Body text colour is inherited; don't set `text-slate-700`.
- `"use client"` only on leaves that need state or browser APIs. Shared values go in plain modules: a server component importing a value from a client module gets a reference, not the value.
- Fonts via `next/font`.
- Keep the accessibility patterns: `aria-disabled` (not `disabled`) on pending buttons, always-rendered `role="status"` wrappers, and focus moved when a focused control disappears.

## Comments

Only when a reader would otherwise get the code wrong: it looks like a bug or redundant, the brief forces it, or a natural refactor would break it. Design rationale goes in `ARCHITECTURE.md`, not in code.

## Environment (Windows)

- Git Bash rewrites arguments starting with `/` into paths (`/c` becomes `C:/`). Use PowerShell for those, or avoid the leading slash.
- LF only. Check edited files aren't CRLF (`file <path>`).

## Commits

- If one file holds two logical steps, stage them separately: write the intermediate version, `git add` it, then restore the working copy.
