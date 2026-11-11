import { describe, expect, it } from "vitest";
import { cartLines, cartTotal, sameLines, setQty, type CheckoutItem } from "./cart";

const ITEMS: CheckoutItem[] = [
  { sku: "notebook", name: "Field notebook", priceCents: 1500 },
  { sku: "pen", name: "Gel pen", priceCents: 400 },
  { sku: "case", name: "Slip case", priceCents: 2200 },
];

describe("cart", () => {
  it("lists lines in catalogue order", () => {
    expect(cartLines(ITEMS, { case: 1, notebook: 2 })).toEqual([
      { sku: "notebook", qty: 2 },
      { sku: "case", qty: 1 },
    ]);
  });

  it("totals unit price times quantity", () => {
    expect(cartTotal(ITEMS, {})).toBe(0);
    expect(cartTotal(ITEMS, { notebook: 1, pen: 3 })).toBe(1500 + 1200);
  });

  it("drops a line when its quantity goes below 1", () => {
    expect(setQty({ notebook: 1, pen: 2 }, "notebook", 0)).toEqual({ pen: 2 });
    expect(setQty({}, "pen", 1)).toEqual({ pen: 1 });
  });

  it("compares sku and quantity pairs in any order", () => {
    const snapshot = [{ sku: "notebook", qty: 1 }];
    expect(sameLines(snapshot, [{ sku: "notebook", qty: 1 }])).toBe(true);
    expect(sameLines(snapshot, [{ sku: "notebook", qty: 2 }])).toBe(false);
    expect(sameLines(snapshot, [...snapshot, { sku: "pen", qty: 1 }])).toBe(false);
    expect(sameLines(snapshot, [])).toBe(false);
    expect(
      sameLines(
        [
          { sku: "pen", qty: 1 },
          { sku: "case", qty: 2 },
        ],
        [
          { sku: "case", qty: 2 },
          { sku: "pen", qty: 1 },
        ],
      ),
    ).toBe(true);
  });
});
