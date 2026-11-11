# Take-home: shop counter

**Role:** Senior Next.js
**Time:** about 8 hours of work. You have 3 days to hand it in. Note the actual time in the README. Finish the required behaviour and the required tests before adding anything else. If you run out of time, stop and list in the README what is missing. That is better than everything half done.

**Stack:** Next.js (App Router), React, TypeScript, Tailwind CSS, react-hook-form, zod, React Testing Library, and Playwright. Use route handlers for the API. Use any current stable versions. The package manager is your choice.

Build a small shop with three parts: a server-rendered catalogue with a deliberate caching choice, a staff desk that records payments, and a checkout that charges the cart as it was when Pay was pressed. Data lives in the server process. There is no real payment provider, no login, and no database. An in-memory store that resets when the server restarts is enough.

## Catalogue data

| sku | name | price | remaining | extras |
| --- | --- | ---: | ---: | --- |
| `lamp` | Maple lamp | $80 | 5 | none |
| `stool` | Cedar stool | $120 | 2 | Cushion (`cushion`) $25 |
| `notebook` | Field notebook | $15 | not limited | none |
| `pen` | Gel pen | $4 | not limited | none |
| `case` | Slip case | $22 | not limited | none |

Format dollars as USD with no cents.

`GET /api/catalog` reads the live store and returns:

```json
[
  { "sku": "lamp", "name": "Maple lamp", "priceCents": 8000, "remaining": 5, "extras": [] },
  { "sku": "stool", "name": "Cedar stool", "priceCents": 12000, "remaining": 2, "extras": [{ "code": "cushion", "name": "Cushion", "priceCents": 2500 }] },
  { "sku": "notebook", "name": "Field notebook", "priceCents": 1500, "remaining": null, "extras": [] },
  { "sku": "pen", "name": "Gel pen", "priceCents": 400, "remaining": null, "extras": [] },
  { "sku": "case", "name": "Slip case", "priceCents": 2200, "remaining": null, "extras": [] }
]
```

`remaining: null` means the item is not stock-limited.

## Shop pages

`/shop` lists every item with its name, price, and `5 left` (the remaining count) or `Not stock-limited`. Each item links to `/shop/<sku>`.

`/shop` has a field labelled **Search** and a select labelled **Sort**:

- Search keeps its value in the URL as `?q=`. It matches item names, ignoring case.
- Sort keeps its value in the URL as `?sort=`: `name` (default), `price-asc`, or `price-desc`.
- Loading `/shop?q=sto&sort=price-desc` directly shows only Cedar stool. Reloading keeps the filter. The browser Back button returns to the previous filter.
- No match shows `No items match`.

`/shop/<sku>` shows the name, price, remaining, and extras. The page title is `<name> | Shop counter` (for example `Cedar stool | Shop counter`) and it has a meta description. An unknown sku answers HTTP 404 with the not-found page.

### Caching

The shop pages are server components and read the catalogue through one function, `getCatalog()`. Each time `getCatalog()` actually runs (not when a cached result is served), it adds 1 to a counter. `GET /api/debug/reads` returns `{ "catalogReads": <n> }`. `GET /api/catalog` reads the live store directly and does not count.

Requirements, checked on a production build (`next build` then `next start`):

- Requesting the same shop pages again while nothing has changed does not run `getCatalog()` again.
- After a successful `POST /api/payments`, the next request for `/shop` and `/shop/<sku>` shows the new remaining.

Choose the mechanism (static rendering with on-demand revalidation, a revalidate period plus on-demand invalidation, `use cache` with tags, or something else) and explain it in `ARCHITECTURE.md`. Keeping the search in the URL may push the page towards dynamic rendering. How you handle that is part of what we're looking at.

## Staff desk: record a payment

`/desk` has a form with the fields Email, Item, Extra, and Charge id, plus a **Payment queue** that lists the payments recorded in this server process. The queue's empty text is `No payments recorded`. Each queue row shows the email, the item name, the total, and the charge id. Items on the form are Maple lamp and Cedar stool only.

**Preview** and **Record payment** both call one shared function named `validatePayment`. The README names the file that exports it.

`validatePayment` accepts `{ email, sku, externalChargeId, extraCode }` and returns field errors or a normalised value. Rules:

- Email is required and must contain one `@` with text on both sides. Error: `Enter a valid email`. Store and display the trimmed, lowercased email.
- Item is required and must be `lamp` or `stool`. Error: `Choose an item`.
- Charge id matches `^ch_[A-Za-z0-9]{8,}$`. Error: `Enter a charge id like ch_12345678`.
- `extraCode` is omitted, null, or `cushion`. Cushion is allowed only with `stool`. Any other pairing returns `That extra is not sold with this item`. Choosing Maple lamp clears a selected Cushion in the form.

`POST /api/payments/preview` runs that function and writes nothing. Success body:

```json
{
  "ok": true,
  "preview": {
    "email": "ada@example.com",
    "sku": "lamp",
    "itemName": "Maple lamp",
    "extraCode": null,
    "extraName": null,
    "totalCents": 8000,
    "remainingAfter": 4
  }
}
```

A failure answers HTTP 400 with `{ "ok": false, "errors": { "email": "...", "sku": "...", "externalChargeId": "...", "extraCode": "..." } }`, listing only the fields that failed.

The preview region is labelled **Payment preview**. It shows the email, the item, the extra or `None`, the total, and the remaining count after this payment.

`POST /api/payments` uses the same function and the same error body. The first success answers HTTP 201:

```json
{
  "replayed": false,
  "payment": {
    "email": "ada@example.com",
    "sku": "lamp",
    "itemName": "Maple lamp",
    "extraCode": null,
    "externalChargeId": "ch_12345678",
    "totalCents": 8000
  }
}
```

It takes 1 off `remaining`. Sending the same `externalChargeId` again answers HTTP 200 with `"replayed": true` and the original payment (the original sku and total) and does not take another one off. A second new charge for the same email and sku is allowed while remaining is above 0. When remaining is 0, the answer is HTTP 409 `{ "ok": false, "errors": { "sku": "Sold out" } }`.

## Checkout

`/checkout` sells Field notebook, Gel pen, and Slip case. Each row has **Add**. Once a line is in the cart, the row shows the quantity and lets the user increase it, decrease it, and remove it. The cart total is labelled **Cart total** and updates immediately. It is the catalogue unit price times the quantity, added up.

**Pay** with an empty cart shows `Add an item before paying` and creates no attempt.

**Pay** with items calls `POST /api/checkout/begin`:

```json
{ "lines": [{ "sku": "notebook", "qty": 1, "unitPriceCents": 1 }] }
```

The server ignores any `unitPriceCents` from the client. It prices every line from the catalogue, stores an attempt that cannot change, and returns:

```json
{
  "attemptId": "generated",
  "lines": [{ "sku": "notebook", "name": "Field notebook", "unitPriceCents": 1500, "qty": 1 }],
  "amountCents": 1500
}
```

An unknown sku, a qty below 1, or an empty `lines` array answers HTTP 400 `{ "error": "invalid_cart" }`.

After Pay, the cart stays editable. A region labelled **Payment in progress** shows the snapshot lines, and **Amount due** shows the snapshot total. Amount due stays on the snapshot while the live cart changes.

When the live cart's sku and quantity pairs differ from the snapshot, show a status message with this exact text:

`Your cart changed after payment started. You will be charged the amount below.`

**Complete payment** calls `POST /api/checkout/complete` with `{ "attemptId": "..." }`. The server builds the order from the stored snapshot. Any line items in that body are ignored. Response:

```json
{
  "orderId": "generated",
  "attemptId": "same",
  "lines": [{ "sku": "notebook", "name": "Field notebook", "unitPriceCents": 1500, "qty": 1 }],
  "amountCents": 1500
}
```

The confirmation heading is **Order placed**. It lists the snapshot lines and shows **Amount charged** as the snapshot total. Completing the same attempt again returns the same order and the same amount.

Worked example: add one Field notebook, press Pay, then add one Gel pen. Amount due stays `$15`, the status message is visible, and the placed order contains the notebook only.

## ARCHITECTURE.md

About one page, in your own words:

- For each route, what renders on the server and what on the client, and why.
- Your caching choice for the shop pages, how a payment makes them fresh again, and how the URL search fits in.
- Why the charged amount is the server snapshot and not the live cart total.
- What breaks in this design when it runs on several serverless instances (your deployed URL will show some of it), and what you would use instead.
- What you checked for accessibility, and how.

## Tests

These must pass. Unit and component tests run with the README's `test` command. Playwright runs with a separate command the README names (for example `test:e2e`).

1. **Divergence** (React Testing Library or Playwright). Pay for one Field notebook, add a Gel pen, assert Amount due is `$15` and the status message is present, complete payment, and assert the placed order is the notebook at `$15`.
2. **Shared validation** (any runner). Preview and record both reject Cushion on Maple lamp, and a preview leaves `remaining` unchanged. A direct call or a rendered form both count if both paths are really exercised.
3. **URL filter** (Playwright). Open `/shop`, type `lamp` into Search, assert the URL contains `q=lamp` and only Maple lamp is listed, reload and assert the same, go back and assert all five items are listed.

## What we are looking at

- The server/client split and the caching choice, and how well `ARCHITECTURE.md` explains them
- Search and sort that live in the URL
- Preview and record share `validatePayment`. Replays are safe.
- The charged amount is the server snapshot
- Page titles, 404s, and accessible markup
- The three tests
- A README with install, dev, and test commands (including Playwright), the Node version, the time spent, and the path of `validatePayment`

## Out of scope

A real payment provider, email, accounts, persistence across restarts, and visual polish beyond a clear layout.

## Submit

- A link to a Git repository with your commit history.
- A deployed URL (Vercel or similar). In-memory data on a serverless host will behave oddly. That's expected. Write about it in `ARCHITECTURE.md` and don't work around it.
- `ARCHITECTURE.md` in the repository.

Add a section to the README called **AI tools**: which tools you used, for which parts, and one place where you disagreed with the output and why. Using them is fine and expected.

After you hand in, we'll book a 30-minute call where you walk us through your choices and we push back on a few of them.
