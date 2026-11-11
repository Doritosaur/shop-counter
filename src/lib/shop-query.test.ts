import { describe, expect, it } from "vitest";
import { SEED_PRODUCTS } from "./products";
import { applyShopQuery, parseShopQuery, shopHref, stockLabel } from "./shop-query";

const products = SEED_PRODUCTS.map((p) => ({ ...p }));
const names = (q: string, sort: Parameters<typeof applyShopQuery>[1]["sort"] = "name") =>
  applyShopQuery(products, { q, sort }).map((p) => p.name);

describe("parseShopQuery", () => {
  it("defaults to no search and name order", () => {
    expect(parseShopQuery({})).toEqual({ q: "", sort: "name" });
  });

  it("reads q and sort", () => {
    expect(parseShopQuery({ q: "sto", sort: "price-desc" })).toEqual({
      q: "sto",
      sort: "price-desc",
    });
  });

  it("falls back to name for an unknown sort", () => {
    expect(parseShopQuery({ sort: "cheapest" }).sort).toBe("name");
  });

  it("uses the first value of a repeated param", () => {
    expect(parseShopQuery({ q: ["lamp", "pen"], sort: ["price-asc", "name"] })).toEqual({
      q: "lamp",
      sort: "price-asc",
    });
  });
});

describe("applyShopQuery", () => {
  it("sorts by name by default", () => {
    expect(names("")).toEqual([
      "Cedar stool",
      "Field notebook",
      "Gel pen",
      "Maple lamp",
      "Slip case",
    ]);
  });

  it("sorts by price both ways", () => {
    expect(names("", "price-asc")).toEqual([
      "Gel pen",
      "Field notebook",
      "Slip case",
      "Maple lamp",
      "Cedar stool",
    ]);
    expect(names("", "price-desc")).toEqual([
      "Cedar stool",
      "Maple lamp",
      "Slip case",
      "Field notebook",
      "Gel pen",
    ]);
  });

  it("matches names ignoring case", () => {
    expect(names("LAMP")).toEqual(["Maple lamp"]);
    expect(names("e")).toHaveLength(5);
  });

  it("shows only Cedar stool for ?q=sto&sort=price-desc", () => {
    expect(names("sto", "price-desc")).toEqual(["Cedar stool"]);
  });

  it("returns nothing when no name matches", () => {
    expect(names("chair")).toEqual([]);
  });
});

describe("shopHref", () => {
  it("keeps only params with values", () => {
    expect(shopHref({ q: "", sort: null })).toBe("/shop");
    expect(shopHref({ q: "lamp", sort: null })).toBe("/shop?q=lamp");
    expect(shopHref({ q: "lamp", sort: "price-asc" })).toBe("/shop?q=lamp&sort=price-asc");
    expect(shopHref({ q: "", sort: "name" })).toBe("/shop?sort=name");
  });
});

describe("stockLabel", () => {
  it("formats remaining stock", () => {
    expect(stockLabel(5)).toBe("5 left");
    expect(stockLabel(0)).toBe("0 left");
    expect(stockLabel(null)).toBe("Not stock-limited");
  });
});
