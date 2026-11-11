import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getCatalog } from "@/lib/catalog";
import { formatUsd } from "@/lib/money";
import { SEED_PRODUCTS } from "@/lib/products";
import { stockLabel } from "@/lib/shop-query";

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
    <article>
      <p>
        <Link href="/shop" className="underline">
          Back to the shop
        </Link>
      </p>
      <Suspense fallback={<p className="mt-4">Loading item…</p>}>
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
    <>
      <h1 className="mt-4 text-2xl font-semibold">{product.name}</h1>
      <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2">
        <dt className="font-medium">Price</dt>
        <dd>{formatUsd(product.priceCents)}</dd>
        <dt className="font-medium">Remaining</dt>
        <dd>{stockLabel(product.remaining)}</dd>
        <dt className="font-medium">Extras</dt>
        <dd>
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
      </dl>
    </>
  );
}
