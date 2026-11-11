import type { Product } from "./products";

export const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export type ShopQuery = { q: string; sort: SortKey };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | null | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

export function parseSort(value: string | string[] | null | undefined): SortKey {
  const raw = first(value);
  return SORT_OPTIONS.some((option) => option.value === raw) ? (raw as SortKey) : "name";
}

export function parseShopQuery(params: SearchParams): ShopQuery {
  return { q: first(params.q) ?? "", sort: parseSort(params.sort) };
}

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name);

export function applyShopQuery(products: Product[], { q, sort }: ShopQuery): Product[] {
  const needle = q.toLowerCase();
  const matches = products.filter((product) => product.name.toLowerCase().includes(needle));

  return matches.toSorted((a, b) => {
    if (sort === "price-asc") return a.priceCents - b.priceCents || byName(a, b);
    if (sort === "price-desc") return b.priceCents - a.priceCents || byName(a, b);
    return byName(a, b);
  });
}

export function shopHref({ q, sort }: { q: string; sort: SortKey | null }): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  const search = params.toString();
  return search ? `/shop?${search}` : "/shop";
}

export function stockLabel(remaining: number | null): string {
  return remaining === null ? "Not stock-limited" : `${remaining} left`;
}
