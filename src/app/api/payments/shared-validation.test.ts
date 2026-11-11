// @vitest-environment node
// Required test 2 (shared validation). Both route handlers run for real.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findProduct, listPayments, resetStore } from "@/lib/store";
import { POST as preview } from "./preview/route";
import { POST as record } from "./route";

const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidateTag }));

function post(body: unknown) {
  return new Request("http://localhost/api/payments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const lamp = {
  email: "ada@example.com",
  sku: "lamp",
  externalChargeId: "ch_12345678",
  extraCode: null,
};
const cushionOnLamp = { ...lamp, extraCode: "cushion" };
const pairingError = { ok: false, errors: { extraCode: "That extra is not sold with this item" } };

beforeEach(() => {
  resetStore();
  revalidateTag.mockClear();
});

describe("shared validation", () => {
  it("preview rejects Cushion on Maple lamp", async () => {
    const res = await preview(post(cushionOnLamp));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(pairingError);
  });

  it("record rejects Cushion on Maple lamp and writes nothing", async () => {
    const res = await record(post(cushionOnLamp));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual(pairingError);
    expect(findProduct("lamp")?.remaining).toBe(5);
    expect(listPayments()).toEqual([]);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("a successful preview leaves remaining unchanged", async () => {
    const res = await preview(post(lamp));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      preview: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        extraName: null,
        totalCents: 8000,
        remainingAfter: 4,
      },
    });
    expect(findProduct("lamp")?.remaining).toBe(5);
    expect(listPayments()).toEqual([]);
  });
});

describe("POST /api/payments/preview", () => {
  it("answers 400 Sold out when the item is sold out", async () => {
    const stool = { ...lamp, sku: "stool" };
    await record(post({ ...stool, externalChargeId: "ch_stool0001" }));
    await record(post({ ...stool, externalChargeId: "ch_stool0002" }));

    const res = await preview(post({ ...stool, externalChargeId: "ch_stool0003" }));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, errors: { sku: "Sold out" } });
  });
});

describe("POST /api/payments", () => {
  it("answers 201, takes stock and expires the catalogue cache", async () => {
    const res = await record(post(lamp));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      replayed: false,
      payment: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        externalChargeId: "ch_12345678",
        totalCents: 8000,
      },
    });
    expect(findProduct("lamp")?.remaining).toBe(4);
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith("catalog", { expire: 0 });
  });

  it("answers 200 with the original payment on replay", async () => {
    await record(post(lamp));
    revalidateTag.mockClear();

    const res = await record(post({ ...lamp, sku: "stool" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      replayed: true,
      payment: { sku: "lamp", totalCents: 8000, externalChargeId: "ch_12345678" },
    });
    expect(findProduct("lamp")?.remaining).toBe(4);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 409 when sold out", async () => {
    const stool = { ...lamp, sku: "stool" };
    await record(post({ ...stool, externalChargeId: "ch_stool0001" }));
    await record(post({ ...stool, externalChargeId: "ch_stool0002" }));

    const res = await record(post({ ...stool, externalChargeId: "ch_stool0003" }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, errors: { sku: "Sold out" } });
  });

  it("answers 400 with every field for a malformed body", async () => {
    const res = await record(post("{not json"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      ok: false,
      errors: {
        email: "Enter a valid email",
        sku: "Choose an item",
        externalChargeId: "Enter a charge id like ch_12345678",
      },
    });
  });
});
