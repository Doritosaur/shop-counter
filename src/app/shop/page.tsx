import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog";
import { formatUsd } from "@/lib/money";
import { applyShopQuery, parseShopQuery, stockLabel } from "@/lib/shop-query";
import { ShopFilters } from "./shop-filters";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse every item in the shop counter catalogue, with prices and stock.",
};

// The shell is prerendered. Results read searchParams per request, but
// getCatalog() is cached, so a new search or sort does not run it again.
export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <h1 className="text-2xl font-semibold">Shop</h1>
      <Suspense fallback={<p className="mt-6">Loading items…</p>}>
        <ShopResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ShopResults({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  const params = await searchParams;
  const query = parseShopQuery(params);
  const products = applyShopQuery(await getCatalog(), query);

  return (
    <div className="mt-6 space-y-6">
      <ShopFilters q={query.q} sort={query.sort} sortInUrl={params.sort !== undefined} />

      <p role="status" className="sr-only">
        {products.length === 1 ? "1 item" : `${products.length} items`}
      </p>

      {products.length === 0 ? (
        <p>No items match</p>
      ) : (
        <ul aria-label="Items" className="divide-y divide-zinc-300 dark:divide-zinc-700">
          {products.map((product) => (
            <li key={product.sku} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <Link href={`/shop/${product.sku}`} className="font-medium underline-offset-4 hover:underline">
                {product.name}
              </Link>
              <span className="flex gap-4">
                <span>{formatUsd(product.priceCents)}</span>
                <span>{stockLabel(product.remaining)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
