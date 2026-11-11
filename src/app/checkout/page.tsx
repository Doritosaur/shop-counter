import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import type { CheckoutItem } from "@/lib/checkout/cart";
import { CHECKOUT_SKUS } from "@/lib/products";
import { CheckoutCart } from "./checkout-cart";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Add Field notebook, Gel pen or Slip case to a cart and pay.",
};

// Prices come from the cached catalogue, so the page is prerendered. The cart
// lives in the browser; the amount charged comes from the server snapshot.
export default async function CheckoutPage() {
  const catalog = await getCatalog();
  const items: CheckoutItem[] = CHECKOUT_SKUS.map((sku) => {
    const { name, priceCents } = catalog.find((product) => product.sku === sku)!;
    return { sku, name, priceCents };
  });

  return (
    <>
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="mt-6">
        <CheckoutCart items={items} />
      </div>
    </>
  );
}
