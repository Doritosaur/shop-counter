import { expect, test, type Page } from "@playwright/test";

const CART_CHANGED =
  "Your cart changed after payment started. You will be charged the amount below.";

/** Wait for hydration so the buttons' handlers are attached. */
async function openCheckout(page: Page) {
  await page.goto("/checkout");
  await page.waitForLoadState("networkidle");
}

function row(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

test("has a title and lists only the checkout items", async ({ page }) => {
  await openCheckout(page);
  await expect(page).toHaveTitle("Checkout | Shop counter");
  await expect(page.getByRole("list", { name: "Items" }).getByRole("listitem")).toHaveText([
    /Field notebook/,
    /Gel pen/,
    /Slip case/,
  ]);
});

// Required test 1 (divergence), against the real server.
test("charges the snapshot when the cart changes after Pay", async ({ page }) => {
  await openCheckout(page);
  await row(page, "Field notebook").getByRole("button", { name: "Add" }).click();
  await page.getByRole("button", { name: "Pay", exact: true }).click();

  const progress = page.getByRole("region", { name: "Payment in progress" });
  await expect(progress).toBeVisible();
  await row(page, "Gel pen").getByRole("button", { name: "Add" }).click();

  await expect(progress.getByRole("status", { name: "Amount due" })).toHaveText("$15");
  await expect(page.getByText(CART_CHANGED)).toBeVisible();

  await page.getByRole("button", { name: "Complete payment" }).click();

  const placed = page.getByRole("region", { name: "Order placed" });
  await expect(placed).toContainText("Field notebook × 1");
  await expect(placed).not.toContainText("Gel pen");
  await expect(placed.getByRole("status", { name: "Amount charged" })).toHaveText("$15");
});

test("Pay with an empty cart asks for an item and sends nothing", async ({ page }) => {
  await openCheckout(page);
  const begins: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/checkout/begin")) begins.push(request.url());
  });

  await page.getByRole("button", { name: "Pay", exact: true }).click();

  await expect(page.getByText("Add an item before paying")).toBeVisible();
  expect(begins).toEqual([]);
});

test("begin ignores the client price and complete returns the same order", async ({ request }) => {
  const begin = await request.post("/api/checkout/begin", {
    data: { lines: [{ sku: "notebook", qty: 1, unitPriceCents: 1 }] },
  });
  const attempt = await begin.json();
  expect(attempt.amountCents).toBe(1500);

  const complete = () =>
    request.post("/api/checkout/complete", {
      data: { attemptId: attempt.attemptId, lines: [{ sku: "pen", qty: 9 }] },
    });
  const first = await (await complete()).json();
  const second = await (await complete()).json();

  expect(first.amountCents).toBe(1500);
  expect(second).toEqual(first);
});
