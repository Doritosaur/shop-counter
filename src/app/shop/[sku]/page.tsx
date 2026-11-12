import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog";
import { formatUsd } from "@/lib/money";
import { SEED_PRODUCTS } from "@/lib/products";
import { stockLabel } from "@/lib/shop-query";
import * as ui from "@/app/ui";

// Unknown skus never reach this page: src/proxy.ts answers them with a 404.
export function generateStaticParams() {
  return SEED_PRODUCTS.map(({ sku }) => ({ sku }));
}

async function getProduct(sku: string) {
  const product = (await getCatalog()).find((p) => p.sku === sku);
  if (!product) notFound();
  return product;
}

/**
 * Reads at request time. A build-time getCatalog() read here is reused stale
 * on the first request after a payment. Cost: <title> streams into the body.
 */
export async function generateMetadata({ params }: PageProps<"/shop/[sku]">): Promise<Metadata> {
  const { sku } = await params;
  await connection();
  const product = await getProduct(sku);
  return {
    title: product.name,
    description: `${product.name} for ${formatUsd(product.priceCents)} at the shop counter.`,
  };
}

export default function ProductPage({ params }: PageProps<"/shop/[sku]">) {
  return (
    <article className="max-w-lg">
      <p>
        <Link href="/shop" className={ui.link}>
          <span aria-hidden="true">← </span>Back to the shop
        </Link>
      </p>
      <Suspense fallback={<p className={`mt-4 ${ui.muted}`}>Loading item…</p>}>
        <ProductDetails params={params} />
      </Suspense>
    </article>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/shop/[sku]">, "params">) {
  const { sku } = await params;
  await connection();
  const product = await getProduct(sku);

  return (
    <div className={`${ui.card} mt-4`}>
      <h1 className={ui.pageTitle}>{product.name}</h1>
      <dl className={`${ui.detailList} mt-4`}>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-slate-600">Price</dt>
          <dd className={`${ui.price} text-base`}>{formatUsd(product.priceCents)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-slate-600">Remaining</dt>
          <dd className={ui.stockBadge(product.remaining)}>{stockLabel(product.remaining)}</dd>
        </div>
        <div className="flex items-start justify-between gap-4 py-2.5">
          <dt className="text-slate-600">Extras</dt>
          <dd className="text-right">
            {product.extras.length === 0 ? (
              "None"
            ) : (
              <ul>
                {product.extras.map((extra) => (
                  <li key={extra.code}>
                    {extra.name} ({formatUsd(extra.priceCents)})
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
