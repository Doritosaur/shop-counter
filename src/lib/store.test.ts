import { beforeEach, describe, expect, it } from "vitest";
import {
  findProduct,
  getCatalogReads,
  getStore,
  listProducts,
  recordCatalogRead,
  resetStore,
} from "./store";

beforeEach(() => {
  resetStore();
});

describe("store", () => {
  it("seeds the catalogue from the brief", () => {
    expect(listProducts()).toEqual([
      { sku: "lamp", name: "Maple lamp", priceCents: 8000, remaining: 5, extras: [] },
      {
        sku: "stool",
        name: "Cedar stool",
        priceCents: 12000,
        remaining: 2,
        extras: [{ code: "cushion", name: "Cushion", priceCents: 2500 }],
      },
      { sku: "notebook", name: "Field notebook", priceCents: 1500, remaining: null, extras: [] },
      { sku: "pen", name: "Gel pen", priceCents: 400, remaining: null, extras: [] },
      { sku: "case", name: "Slip case", priceCents: 2200, remaining: null, extras: [] },
    ]);
  });

  it("returns copies so callers cannot change stock", () => {
    const products = listProducts();
    products[0].remaining = 0;
    products[1].extras[0].priceCents = 1;
    const stool = findProduct("stool");
    stool!.remaining = 99;

    expect(findProduct("lamp")?.remaining).toBe(5);
    expect(findProduct("stool")?.remaining).toBe(2);
    expect(findProduct("stool")?.extras[0].priceCents).toBe(2500);
  });

  it("returns undefined for an unknown sku", () => {
    expect(findProduct("chair")).toBeUndefined();
  });

  it("keeps the store on globalThis, so every bundle shares it", () => {
    expect((globalThis as { __shopStore?: unknown }).__shopStore).toBe(getStore());
  });

  it("counts catalogue reads", () => {
    expect(getCatalogReads()).toBe(0);
    recordCatalogRead();
    recordCatalogRead();
    expect(getCatalogReads()).toBe(2);
  });

  it("resets to the seed data", () => {
    getStore().products[0].remaining = 0;
    recordCatalogRead();
    resetStore();
    expect(findProduct("lamp")?.remaining).toBe(5);
    expect(getCatalogReads()).toBe(0);
  });
});
