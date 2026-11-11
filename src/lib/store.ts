import { cloneProduct, SEED_PRODUCTS, type Product } from "./products";

export type { Product } from "./products";

export type Payment = {
  email: string;
  sku: string;
  itemName: string;
  extraCode: string | null;
  externalChargeId: string;
  totalCents: number;
};

export type Store = {
  products: Product[];
  catalogReads: number;
  payments: Payment[];
};

function createStore(): Store {
  return { products: SEED_PRODUCTS.map(cloneProduct), catalogReads: 0, payments: [] };
}

// On globalThis so pages and route handlers share one copy even if Next.js
// bundles this module more than once.
const globalForStore = globalThis as typeof globalThis & { __shopStore?: Store };

export function getStore(): Store {
  globalForStore.__shopStore ??= createStore();
  return globalForStore.__shopStore;
}

/** For tests. */
export function resetStore(): void {
  globalForStore.__shopStore = createStore();
}

/** Copies, so callers cannot change stock. */
export function listProducts(): Product[] {
  return getStore().products.map(cloneProduct);
}

export function findProduct(sku: string): Product | undefined {
  const product = getStore().products.find((p) => p.sku === sku);
  return product ? cloneProduct(product) : undefined;
}

export function recordCatalogRead(): void {
  getStore().catalogReads += 1;
}

export function getCatalogReads(): number {
  return getStore().catalogReads;
}

export function listPayments(): Payment[] {
  return getStore().payments.map((payment) => ({ ...payment }));
}
