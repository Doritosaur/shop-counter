# Architecture

## Server and client split per route

The server renders the data and HTML. The client gets only what needs interaction or browser state.

| Route | Server | Client |
| --- | --- | --- |
| `/shop` | Heading prerendered; results per request in `<Suspense>` | `ShopFilters`: Search and Sort, kept in the URL |
| `/shop/<sku>` | Everything: name, price, stock and extras, per request | Nothing, it has no interaction |
| `/desk` | Shell; Payment queue per request | `PaymentForm`: runs `validatePayment` for instant errors, and the server runs it again |
| `/checkout` | Prices from `getCatalog()`, prerendered | `CheckoutCart`: the cart is browser state, and Cart total updates immediately |

On every page the layout is server-rendered. Only `NavLinks` is client, because it reads the pathname to mark the current section. `/` and the 404 are fully static.

Unknown skus get a 404 from `src/proxy.ts`, because with Cache Components the shell streams with a 200 before `notFound()` runs. The proxy rewrites them to a path no route matches. Rewriting to `/_not-found` worked locally, but on Vercel it answered 200, because that page is served prerendered.

The pages need JavaScript. Content inside `<Suspense>` streams in and is revealed by React's inline script, so without JavaScript `/shop` shows only "Loading items…".

## Caching the shop pages

I cache the data, not the page. `getCatalog()` is `'use cache'` with `cacheTag('catalog')` and `cacheLife('max')`, and it counts reads inside the cached body, so a cache hit skips the count.

I chose a tag over the other options. A revalidate period re-reads when nothing changed and serves stale stock until it fires. A fully static page can't hold a search that lives in the URL. A tag refreshes exactly when stock changes, and it covers every page that reads the catalogue.

Search and sort read `searchParams`, so the results are dynamic. They filter and sort the cached list in memory, so a new search never runs `getCatalog()` again. Partial prerendering serves the rest of the page static.

A new payment (201) calls `revalidateTag('catalog', { expire: 0 })`. With `'max'`, the next request would get stale stock while it refreshes. `updateTag` only works in Server Actions.

`/shop/<sku>` reads at request time in both `generateMetadata` and the page. A build-time read in metadata came back stale after a payment, and `revalidatePath` caused a 500. The cost of this fix is that `<title>` streams into the body.

To verify, I used `/api/debug/reads` on `next build` plus `next start`. Repeat requests, searches and sorts leave the counter flat. After a payment, `/shop` and `/shop/lamp` show the new stock.

## Shared validation and safe replays

`validatePayment` (`src/lib/payments/validate-payment.ts`) is the only place the payment rules live. The preview route, the record route and the desk form's resolver all call it, so the browser shows the same errors the server returns, and the server never trusts the browser.

The zod schema checks each field on its own. Cushion on Maple lamp is checked after it, not in an object `refine`, because a refine only runs once every field passes. That way all failing fields are reported at once.

Record checks in this order: validate, then replay, then stock. A retried charge id gets its original payment back even after the last item sold, instead of a 409 for a payment that went through. The stock check and the decrement run with no `await` between them, so two requests in one process can't both take the last item.

## Why the charge is the server snapshot

The client can send any `unitPriceCents`, and the cart stays editable after Pay. So `begin` reads only sku and qty, prices each line from the store, and freezes the attempt. `complete` reads only `attemptId` and builds the order from that snapshot. The customer pays what they saw at Pay. A retry returns the same order and can't charge twice.

## Running on several serverless instances

All state is in-memory per instance: stock, payments, attempts, orders, the read counter and the `'use cache'` entries. A cold start resets it.

- Stock and the queue depend on which instance answers.
- The same charge id can be recorded on two instances, so stock goes down twice.
- `complete` can reach an instance without the attempt and get a 404.
- A tag invalidation on one instance doesn't refresh another's cache.

Seen on the deployed URL (https://shop-counter-three.vercel.app):

- `/api/debug/reads` shows 0, even after the shop pages render with stock. The read ran during the build on another machine. The cache entry shipped with the deployment, but the counter didn't.
- The shop pages' static shell comes from Vercel's CDN (`x-vercel-cache: PRERENDER`), and the results stream from a function.
- The 404 for unknown skus answered 200 until the proxy stopped rewriting to `/_not-found` (see above).

Instead, I'd use Postgres with an atomic decrement (`WHERE remaining > 0`), a unique `externalChargeId`, and attempts and orders as rows. A shared cache handler would let invalidation reach every instance.

## Accessibility checks

- One `h1` per page, a skip link, a labelled `nav` and `main`.
- Every control has a `<label>`. Errors use `aria-invalid` and `aria-describedby`, and focus moves to the rejected field.
- Regions are labelled by their headings. Outcomes and the cart-changed message are `role="status"`.
- Pending buttons use `aria-disabled`, so focus isn't lost. At checkout, focus moves on when a button disappears, and to the new heading after Pay or Complete.
- Tests find elements by role and accessible name.

Checked automatically in `pnpm test:e2e`:

- **axe** (`@axe-core/playwright`, WCAG 2.2 AA plus best-practice), on:
  - every page and the 404
  - the desk with errors, a preview and a filled queue
  - checkout with the empty-cart message, the changed-cart message and a placed order
- **Keyboard only:**
  - The skip link comes first.
  - Search, sort, the desk form and the whole checkout work with Tab, Enter and the arrow keys.
  - Focus never drops to the page, and focused controls show a ring.
- **Reflow at 320px** (WCAG 1.4.10): no page scrolls sideways. This caught the payment queue table overflowing, which I fixed by letting long emails and charge ids wrap.

Not checked: a real screen reader, and 200% text zoom.

## Choices where the brief is open

- **Payments:**
  - Checks run in this order: validate, then replay, then stock.
  - A known charge id replays the original payment, even after sell-out.
  - Previewing a sold-out item answers 400 `{ sku: "Sold out" }`.
  - A body that isn't a JSON object counts as an empty form.
- **Checkout API:**
  - `lamp` and `stool` are `invalid_cart`, since checkout sells only the other three.
  - A qty that isn't a whole number ≥ 1 is `invalid_cart`.
  - Both routes answer 200. An unknown `attemptId` answers 404 `{ "error": "unknown_attempt" }`.
  - A repeated sku stays as separate lines. The page never sends one.
- **Checkout UI:**
  - Decrease at 1 removes the line.
  - Pay again starts a new attempt.
  - Order placed clears the cart.
