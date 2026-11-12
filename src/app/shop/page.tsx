import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog";
import { formatUsd } from "@/lib/money";
import { applyShopQuery, parseShopQuery, stockLabel } from "@/lib/shop-query";
import * as ui from "@/app/ui";
import { ShopFilters } from "./shop-filters";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse every item in the shop counter catalogue, with prices and stock.",
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <h1 className={ui.pageTitle}>Shop</h1>
      <p className={ui.pageLead}>Every item in the catalogue, with its price and stock.</p>
      <Suspense fallback={<p className={`mt-6 ${ui.muted}`}>Loading items…</p>}>
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
    <div className="mt-6 space-y-3">
      <ShopFilters q={query.q} sort={query.sort} sortInUrl={params.sort !== undefined} />

      <p role="status" className={ui.caption}>
        {products.length === 1 ? "1 item" : `${products.length} items`}
      </p>

      {products.length === 0 ? (
        <p className={`${ui.card} text-center ${ui.muted}`}>No items match</p>
      ) : (
        <ul aria-label="Items" className={ui.list}>
          {products.map((product) => (
            <li
              key={product.sku}
              className={`${ui.linkRow} flex flex-wrap items-center justify-between gap-x-4 gap-y-1`}
            >
              <Link href={`/shop/${product.sku}`} className={`font-medium text-blue-950 ${ui.stretchedLink}`}>
                {product.name}
              </Link>
              <span className="flex items-center gap-3">
                <span className={ui.price}>{formatUsd(product.priceCents)}</span>
                <span className={ui.stockBadge(product.remaining)}>{stockLabel(product.remaining)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
