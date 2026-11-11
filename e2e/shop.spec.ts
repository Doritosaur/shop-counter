import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/** Wait for hydration so the filters' handlers are attached before typing. */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/** Other specs record payments on the same server, so read stock live. */
async function remaining(request: APIRequestContext, sku: string) {
  const catalog: { sku: string; remaining: number | null }[] = await (
    await request.get("/api/catalog")
  ).json();
  return catalog.find((p) => p.sku === sku)!.remaining;
}

test("loading a filtered URL directly shows only Cedar stool", async ({ page, request }) => {
  const stools = await remaining(request, "stool");
  await page.goto("/shop?q=sto&sort=price-desc");

  const items = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText("Cedar stool");
  await expect(items.first()).toContainText("$120");
  await expect(items.first()).toContainText(`${stools} left`);
  await expect(page.getByLabel("Search")).toHaveValue("sto");
  await expect(page.getByLabel("Sort")).toHaveValue("price-desc");
});

test("sort keeps its value in the URL and back restores it", async ({ page }) => {
  await open(page, "/shop");
  const names = page.getByRole("list", { name: "Items" }).getByRole("link");

  await page.getByLabel("Sort").selectOption("price-asc");
  await expect(page).toHaveURL(/[?&]sort=price-asc/);
  await expect(names.first()).toHaveText("Gel pen");

  await page.getByLabel("Sort").selectOption("price-desc");
  await expect(page).toHaveURL(/[?&]sort=price-desc/);
  await expect(names.first()).toHaveText("Cedar stool");

  await page.goBack();
  await expect(page).toHaveURL(/[?&]sort=price-asc/);
  await expect(page.getByLabel("Sort")).toHaveValue("price-asc");
  await expect(names.first()).toHaveText("Gel pen");
});

test("no match shows No items match", async ({ page }) => {
  await page.goto("/shop?q=chair");
  await expect(page.getByText("No items match")).toBeVisible();
});

test("each item shows price and stock and links to its page", async ({ page, request }) => {
  const lamps = await remaining(request, "lamp");
  await page.goto("/shop");
  const items = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(items.filter({ hasText: "Maple lamp" })).toContainText("$80");
  await expect(items.filter({ hasText: "Maple lamp" })).toContainText(`${lamps} left`);
  await expect(items.filter({ hasText: "Gel pen" })).toContainText("Not stock-limited");

  await page.getByRole("link", { name: "Cedar stool" }).click();

  await expect(page).toHaveURL(/\/shop\/stool$/);
  await expect(page).toHaveTitle("Cedar stool | Shop counter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cedar stool");
  await expect(page.getByText("Cushion ($25)")).toBeVisible();
});

test("product page has a title and meta description", async ({ page }) => {
  await page.goto("/shop/stool");
  await expect(page).toHaveTitle("Cedar stool | Shop counter");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Cedar stool/,
  );
});

test("an unknown sku answers 404 with the not-found page", async ({ page }) => {
  const response = await page.goto("/shop/chair");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
});

test("following a link to /shop resets the filters", async ({ page }) => {
  await open(page, "/shop?q=lamp&sort=price-desc");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Shop", exact: true }).click();

  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByRole("list", { name: "Items" }).getByRole("listitem")).toHaveCount(5);
  await expect(page.getByLabel("Search")).toHaveValue("");
  await expect(page.getByLabel("Sort")).toHaveValue("name");
});
