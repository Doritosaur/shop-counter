// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStore, recordCatalogRead, resetStore } from "@/lib/store";
import { GET as getCatalogRoute } from "./route";
import { GET as getReadsRoute } from "../debug/reads/route";

vi.mock("next/server", () => ({ connection: async () => {} }));

beforeEach(() => {
  resetStore();
});

describe("GET /api/catalog", () => {
  it("returns the catalogue in the shape from the brief", async () => {
    const res = await getCatalogRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
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

  it("reads live stock and does not count as a catalogue read", async () => {
    getStore().products[0].remaining = 3;

    const body = await (await getCatalogRoute()).json();

    expect(body[0].remaining).toBe(3);
    expect(getStore().catalogReads).toBe(0);
  });
});

describe("GET /api/debug/reads", () => {
  it("reports the catalogue read counter", async () => {
    expect(await (await getReadsRoute()).json()).toEqual({ catalogReads: 0 });

    recordCatalogRead();

    expect(await (await getReadsRoute()).json()).toEqual({ catalogReads: 1 });
  });
});
