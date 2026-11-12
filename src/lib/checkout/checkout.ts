import { z } from "zod";
import { CHECKOUT_SKUS } from "@/lib/products";
import { getStore, type CheckoutAttempt, type Order, type OrderLine } from "@/lib/store";

// Only sku and qty are read. Any unitPriceCents from the client is dropped.
const CartSchema = z.object({
  lines: z
    .array(z.object({ sku: z.enum(CHECKOUT_SKUS), qty: z.int().min(1) }))
    .min(1),
});

export type BeginResult = { kind: "ok"; attempt: CheckoutAttempt } | { kind: "invalid_cart" };
export type CompleteResult = { kind: "ok"; order: Order } | { kind: "unknown_attempt" };

function priceLine(sku: string, qty: number): OrderLine {
  const product = getStore().products.find((p) => p.sku === sku);
  // The schema only accepts checkout skus, which always exist in the store.
  if (!product) throw new Error(`Unknown sku after validation: ${sku}`);
  return { sku, name: product.name, unitPriceCents: product.priceCents, qty };
}

function freezeLines(lines: OrderLine[]) {
  return Object.freeze(lines.map((line) => Object.freeze(line)));
}

export function beginCheckout(input: unknown): BeginResult {
  const cart = CartSchema.safeParse(input);
  if (!cart.success) return { kind: "invalid_cart" };

  const lines = cart.data.lines.map((line) => priceLine(line.sku, line.qty));
  const attempt: CheckoutAttempt = Object.freeze({
    attemptId: crypto.randomUUID(),
    lines: freezeLines(lines),
    amountCents: lines.reduce((sum, line) => sum + line.unitPriceCents * line.qty, 0),
  });
  getStore().attempts.set(attempt.attemptId, attempt);
  return { kind: "ok", attempt };
}

/** Builds the order from the stored snapshot. A second call returns the same order. */
export function completeCheckout(attemptId: unknown): CompleteResult {
  if (typeof attemptId !== "string") return { kind: "unknown_attempt" };

  const store = getStore();
  const existing = store.orders.get(attemptId);
  if (existing) return { kind: "ok", order: existing };

  const attempt = store.attempts.get(attemptId);
  if (!attempt) return { kind: "unknown_attempt" };

  const order: Order = Object.freeze({
    orderId: crypto.randomUUID(),
    attemptId,
    lines: attempt.lines,
    amountCents: attempt.amountCents,
  });
  store.orders.set(attemptId, order);
  return { kind: "ok", order };
}
