// No server state, so client components can import it.

export type Extra = {
  code: string;
  name: string;
  priceCents: number;
};

export type Product = {
  sku: string;
  name: string;
  priceCents: number;
  /** `null` means the item is not stock-limited. */
  remaining: number | null;
  extras: Extra[];
};

export const SEED_PRODUCTS: readonly Product[] = [
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
];

export function cloneProduct(product: Product): Product {
  return { ...product, extras: product.extras.map((extra) => ({ ...extra })) };
}

export const DESK_SKUS = ["lamp", "stool"] as const;
export type DeskSku = (typeof DESK_SKUS)[number];

export const CHECKOUT_SKUS = ["notebook", "pen", "case"] as const;
export type CheckoutSku = (typeof CHECKOUT_SKUS)[number];

export function seedProduct(sku: string): Product | undefined {
  return SEED_PRODUCTS.find((product) => product.sku === sku);
}
