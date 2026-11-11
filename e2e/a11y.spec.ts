import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// One charge id for every test: the first records it and the rest replay,
// so the scans take only one lamp off stock.
const CHARGE_ID = "ch_a11yqueue1";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

/** Fails with one line per violation and the selectors it hit. */
async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const report = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(" ")).join("\n  ")}`,
  );
  expect(report).toEqual([]);
}

function row(page: Page, name: string) {
  return page.getByRole("listitem").filter({ hasText: name });
}

// WCAG 1.4.10: content reflows at 320 CSS px without scrolling sideways.
test.describe("reflow at 320px", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const url of ["/shop", "/shop/stool", "/desk", "/checkout"]) {
    test(`${url} has no horizontal scroll`, async ({ page }) => {
      await open(page, url);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("/desk with a payment in the queue has no horizontal scroll", async ({ page, request }) => {
    await request.post("/api/payments", {
      data: { email: "a.long.address.for.reflow@example.com", sku: "lamp", externalChargeId: CHARGE_ID },
    });
    await open(page, "/desk");
    await expect(page.getByRole("table")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`axe, ${colorScheme} scheme`, () => {
    test.use({ colorScheme });

    for (const url of ["/", "/shop", "/shop?q=zzz", "/shop/stool", "/shop/nope", "/desk", "/checkout"]) {
      test(`${url} has no violations`, async ({ page }) => {
        await open(page, url);
        await expectNoViolations(page);
      });
    }

    test("desk with errors, a preview and a recorded payment", async ({ page }) => {
      await open(page, "/desk");
      await page.getByRole("button", { name: "Preview" }).click();
      await expect(page.getByText("Enter a valid email")).toBeVisible();
      await expectNoViolations(page);

      await page.getByLabel("Email").fill("ada@example.com");
      await page.getByLabel("Item").selectOption({ label: "Maple lamp" });
      await page.getByLabel("Charge id").fill(CHARGE_ID);
      await page.getByRole("button", { name: "Preview" }).click();
      await expect(page.getByRole("region", { name: "Payment preview" })).toBeVisible();
      await expectNoViolations(page);

      await page.getByRole("button", { name: "Record payment" }).click();
      // "Payment recorded" the first time, "was already recorded" after.
      await expect(page.getByRole("status").filter({ hasText: "recorded" })).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      await expectNoViolations(page);
    });

    test("checkout with a changed cart and a placed order", async ({ page }) => {
      await open(page, "/checkout");
      await page.getByRole("button", { name: "Pay", exact: true }).click();
      await expect(page.getByText("Add an item before paying")).toBeVisible();
      await expectNoViolations(page);

      await row(page, "Field notebook").getByRole("button", { name: "Add" }).click();
      await page.getByRole("button", { name: "Pay", exact: true }).click();
      await row(page, "Gel pen").getByRole("button", { name: "Add" }).click();
      await expect(page.getByText(/Your cart changed/)).toBeVisible();
      await expectNoViolations(page);

      await page.getByRole("button", { name: "Complete payment" }).click();
      await expect(page.getByRole("region", { name: "Order placed" })).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
