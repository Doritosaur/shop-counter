import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

async function remaining(request: APIRequestContext, sku: string) {
  const catalog: { sku: string; remaining: number | null }[] = await (
    await request.get("/api/catalog")
  ).json();
  return catalog.find((p) => p.sku === sku)!.remaining!;
}

/** Wait for hydration so the form's handlers are attached before typing. */
async function openDesk(page: Page) {
  await page.goto("/desk");
  await page.waitForLoadState("networkidle");
}

async function fillPayment(page: Page, v: { email: string; item: string; charge: string }) {
  await page.getByLabel("Email").fill(v.email);
  await page.getByLabel("Item").selectOption({ label: v.item });
  await page.getByLabel("Charge id").fill(v.charge);
}

test("preview, record, queue and fresh shop stock", async ({ page, request }) => {
  await openDesk(page);
  const queue = page.getByRole("region", { name: "Payment queue" });
  await expect(queue).toContainText("No payments recorded");

  const before = await remaining(request, "lamp");
  await fillPayment(page, { email: " Ada@Example.com ", item: "Maple lamp", charge: "ch_e2edesk01" });

  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByRole("region", { name: "Payment preview" });
  await expect(preview).toContainText("ada@example.com");
  await expect(preview).toContainText("Maple lamp");
  await expect(preview).toContainText("None");
  await expect(preview).toContainText("$80");
  await expect(preview).toContainText(String(before - 1));
  expect(await remaining(request, "lamp")).toBe(before);

  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Payment recorded" })).toBeVisible();

  const row = queue.getByRole("row").filter({ hasText: "ch_e2edesk01" });
  await expect(row).toContainText("ada@example.com");
  await expect(row).toContainText("Maple lamp");
  await expect(row).toContainText("$80");
  expect(await remaining(request, "lamp")).toBe(before - 1);

  await page.goto("/shop");
  await expect(
    page.getByRole("list", { name: "Items" }).getByRole("listitem").filter({ hasText: "Maple lamp" }),
  ).toContainText(`${before - 1} left`);
  await page.goto("/shop/lamp");
  await expect(page.getByText(`${before - 1} left`)).toBeVisible();
});

test("replaying a charge id shows the original and takes no stock", async ({ page, request }) => {
  await openDesk(page);
  await fillPayment(page, { email: "grace@example.com", item: "Cedar stool", charge: "ch_e2edesk02" });
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Payment recorded" })).toBeVisible();
  const after = await remaining(request, "stool");

  await fillPayment(page, { email: "other@example.com", item: "Maple lamp", charge: "ch_e2edesk02" });
  await page.getByRole("button", { name: "Record payment" }).click();

  const status = page.getByRole("status").filter({ hasText: "already recorded" });
  await expect(status).toContainText("Cedar stool");
  await expect(status).toContainText("grace@example.com");
  expect(await remaining(request, "stool")).toBe(after);
  await expect(
    page.getByRole("region", { name: "Payment queue" }).getByRole("row").filter({ hasText: "ch_e2edesk02" }),
  ).toHaveCount(1);
});

test("Cushion with Cedar stool totals $145, and Maple lamp clears it", async ({ page }) => {
  await openDesk(page);
  await fillPayment(page, { email: "ada@example.com", item: "Cedar stool", charge: "ch_e2edesk03" });
  await page.getByLabel("Extra").selectOption({ label: "Cushion" });
  await page.getByRole("button", { name: "Preview" }).click();
  const preview = page.getByRole("region", { name: "Payment preview" });
  await expect(preview).toContainText("Cushion");
  await expect(preview).toContainText("$145");

  await page.getByLabel("Item").selectOption({ label: "Maple lamp" });
  await expect(page.getByLabel("Extra")).toHaveValue("");
});
