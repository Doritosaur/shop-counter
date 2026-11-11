// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/store";
import { POST as begin } from "./begin/route";
import { POST as complete } from "./complete/route";

function post(url: string, body: unknown) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function beginWith(body: unknown) {
  const res = await begin(post("/api/checkout/begin", body));
  return { status: res.status, body: await res.json() };
}

async function completeWith(body: unknown) {
  const res = await complete(post("/api/checkout/complete", body));
  return { status: res.status, body: await res.json() };
}

const notebook = { sku: "notebook", name: "Field notebook", unitPriceCents: 1500, qty: 1 };

beforeEach(() => resetStore());

describe("POST /api/checkout/begin", () => {
  it("prices lines from the catalogue and ignores the client price", async () => {
    const { status, body } = await beginWith({
      lines: [{ sku: "notebook", qty: 1, unitPriceCents: 1 }],
    });

    expect(status).toBe(200);
    expect(body).toEqual({ attemptId: expect.any(String), lines: [notebook], amountCents: 1500 });
  });

  it("adds up unit price times quantity", async () => {
    const { body } = await beginWith({
      lines: [
        { sku: "pen", qty: 3 },
        { sku: "case", qty: 2 },
      ],
    });

    expect(body.amountCents).toBe(3 * 400 + 2 * 2200);
    expect(body.lines).toEqual([
      { sku: "pen", name: "Gel pen", unitPriceCents: 400, qty: 3 },
      { sku: "case", name: "Slip case", unitPriceCents: 2200, qty: 2 },
    ]);
  });

  it("gives each attempt its own id", async () => {
    const cart = { lines: [{ sku: "notebook", qty: 1 }] };
    const first = await beginWith(cart);
    const second = await beginWith(cart);

    expect(first.body.attemptId).not.toBe(second.body.attemptId);
  });

  it.each([
    ["an unknown sku", { lines: [{ sku: "chair", qty: 1 }] }],
    ["a desk item", { lines: [{ sku: "lamp", qty: 1 }] }],
    ["qty 0", { lines: [{ sku: "notebook", qty: 0 }] }],
    ["a negative qty", { lines: [{ sku: "notebook", qty: -1 }] }],
    ["a fractional qty", { lines: [{ sku: "notebook", qty: 1.5 }] }],
    ["a qty as text", { lines: [{ sku: "notebook", qty: "2" }] }],
    ["a missing qty", { lines: [{ sku: "notebook" }] }],
    ["empty lines", { lines: [] }],
    ["no lines", {}],
    ["a body that is not JSON", "not json"],
  ])("rejects %s with invalid_cart", async (_label, body) => {
    expect(await beginWith(body)).toEqual({ status: 400, body: { error: "invalid_cart" } });
    expect(getStore().attempts.size).toBe(0);
  });
});

describe("POST /api/checkout/complete", () => {
  it("builds the order from the snapshot and ignores lines in the body", async () => {
    const { body: attempt } = await beginWith({ lines: [{ sku: "notebook", qty: 1 }] });

    const { status, body } = await completeWith({
      attemptId: attempt.attemptId,
      lines: [{ sku: "pen", qty: 5, unitPriceCents: 1 }],
    });

    expect(status).toBe(200);
    expect(body).toEqual({
      orderId: expect.any(String),
      attemptId: attempt.attemptId,
      lines: [notebook],
      amountCents: 1500,
    });
  });

  it("charges the snapshot even if the catalogue price changes", async () => {
    const { body: attempt } = await beginWith({ lines: [{ sku: "notebook", qty: 1 }] });
    getStore().products.find((p) => p.sku === "notebook")!.priceCents = 9900;

    const { body } = await completeWith({ attemptId: attempt.attemptId });

    expect(body.amountCents).toBe(1500);
    expect(body.lines).toEqual([notebook]);
  });

  it("returns the same order when the attempt is completed again", async () => {
    const { body: attempt } = await beginWith({ lines: [{ sku: "notebook", qty: 1 }] });

    const first = await completeWith({ attemptId: attempt.attemptId });
    const second = await completeWith({ attemptId: attempt.attemptId });

    expect(second).toEqual(first);
    expect(getStore().orders.size).toBe(1);
  });

  it.each([
    ["an unknown attempt id", { attemptId: "nope" }],
    ["no attempt id", {}],
    ["a body that is not JSON", "not json"],
  ])("answers 404 for %s", async (_label, body) => {
    expect(await completeWith(body)).toEqual({ status: 404, body: { error: "unknown_attempt" } });
  });
});
