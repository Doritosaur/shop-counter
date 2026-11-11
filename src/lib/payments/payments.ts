import { getStore, type Payment, type Product } from "@/lib/store";
import { validatePayment, type PaymentErrors, type PaymentInput } from "./validate-payment";

export type PaymentPreview = {
  email: string;
  sku: string;
  itemName: string;
  extraCode: string | null;
  extraName: string | null;
  totalCents: number;
  remainingAfter: number | null;
};

const SOLD_OUT_ERRORS: PaymentErrors = { sku: "Sold out" };

type Invalid = { kind: "invalid"; errors: PaymentErrors };
type SoldOut = { kind: "sold_out"; errors: PaymentErrors };

export type PreviewResult = { kind: "ok"; preview: PaymentPreview } | Invalid | SoldOut;
export type RecordResult =
  | { kind: "created"; payment: Payment }
  | { kind: "replayed"; payment: Payment }
  | Invalid
  | SoldOut;

function productFor(sku: string): Product {
  const product = getStore().products.find((p) => p.sku === sku);
  // validatePayment only accepts desk skus, which always exist in the store.
  if (!product) throw new Error(`Unknown sku after validation: ${sku}`);
  return product;
}

function price(input: PaymentInput) {
  const product = productFor(input.sku);
  const extra = product.extras.find((e) => e.code === input.extraCode) ?? null;
  return {
    product,
    extra,
    totalCents: product.priceCents + (extra?.priceCents ?? 0),
  };
}

function isSoldOut(product: Product): boolean {
  return product.remaining !== null && product.remaining <= 0;
}

export function previewPayment(input: unknown): PreviewResult {
  const result = validatePayment(input);
  if (!result.ok) return { kind: "invalid", errors: result.errors };

  const { product, extra, totalCents } = price(result.value);
  if (isSoldOut(product)) return { kind: "sold_out", errors: SOLD_OUT_ERRORS };

  return {
    kind: "ok",
    preview: {
      email: result.value.email,
      sku: product.sku,
      itemName: product.name,
      extraCode: extra?.code ?? null,
      extraName: extra?.name ?? null,
      totalCents,
      remainingAfter: product.remaining === null ? null : product.remaining - 1,
    },
  };
}

/**
 * Validate, then replay, then stock: a known charge id always replays.
 * Synchronous, so the stock check and decrement cannot interleave.
 */
export function recordPayment(input: unknown): RecordResult {
  const result = validatePayment(input);
  if (!result.ok) return { kind: "invalid", errors: result.errors };

  const store = getStore();
  const existing = store.payments.find(
    (p) => p.externalChargeId === result.value.externalChargeId,
  );
  if (existing) return { kind: "replayed", payment: { ...existing } };

  const { product, extra, totalCents } = price(result.value);
  if (isSoldOut(product)) return { kind: "sold_out", errors: SOLD_OUT_ERRORS };

  const payment: Payment = {
    email: result.value.email,
    sku: product.sku,
    itemName: product.name,
    extraCode: extra?.code ?? null,
    externalChargeId: result.value.externalChargeId,
    totalCents,
  };
  if (product.remaining !== null) product.remaining -= 1;
  store.payments.push(payment);

  return { kind: "created", payment: { ...payment } };
}
