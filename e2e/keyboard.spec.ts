import { expect, test, type Locator, type Page } from "@playwright/test";

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/** Presses Tab until `target` has focus, so the test fails if it is unreachable. */
async function tabTo(page: Page, target: Locator, max = 20) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`Not reachable with Tab: ${target}`);
}

async function expectFocusRing(page: Page) {
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe("none");
}

function row(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

test("the skip link is first and jumps past the navigation", async ({ page }) => {
  await open(page, "/shop");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Search")).toBeFocused();
});

test("shop search and sort work from the keyboard", async ({ page }) => {
  await open(page, "/shop");
  await tabTo(page, page.getByLabel("Search"));
  await expectFocusRing(page);
  await page.keyboard.type("sto");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=sto/);

  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Sort")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page).toHaveURL(/sort=price-asc/);

  await tabTo(page, page.getByRole("link", { name: "Cedar stool" }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/shop\/stool$/);
});

test("the desk form can be filled, previewed and recorded from the keyboard", async ({ page }) => {
  await open(page, "/desk");
  await tabTo(page, page.getByLabel("Email"));
  await page.keyboard.type("kb@example.com");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Item")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel("Item")).toHaveValue("lamp");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Extra")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Charge id")).toBeFocused();
  await page.keyboard.type("ch_keyboard1");

  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Payment preview" })).toBeVisible();

  await tabTo(page, page.getByRole("button", { name: "Record payment" }));
  await expectFocusRing(page);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "Payment recorded" })).toBeVisible();
});

test("a desk error moves focus to the rejected field", async ({ page }) => {
  await open(page, "/desk");
  await tabTo(page, page.getByRole("button", { name: "Preview" }));
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Email")).toBeFocused();
});

test("checkout can be used from the keyboard without losing focus", async ({ page }) => {
  await open(page, "/checkout");
  const notebook = row(page, "Field notebook");

  await tabTo(page, notebook.getByRole("button", { name: "Add" }));
  await expectFocusRing(page);
  await page.keyboard.press("Enter");
  await expect(notebook.getByRole("button", { name: "Increase" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(notebook).toContainText("Quantity 2");

  await page.keyboard.press("Shift+Tab");
  await expect(notebook.getByRole("button", { name: "Decrease" })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(notebook.getByRole("button", { name: "Add" })).toBeFocused();

  await page.keyboard.press("Enter");
  await tabTo(page, page.getByRole("button", { name: "Pay", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Payment in progress" })).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Complete payment" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeFocused();
});
