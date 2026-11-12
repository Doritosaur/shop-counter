import type { Metadata } from "next";
import { getCatalog } from "@/lib/catalog";
import type { CheckoutItem } from "@/lib/checkout/cart";
import { CHECKOUT_SKUS } from "@/lib/products";
import * as ui from "@/app/ui";
import { CheckoutCart } from "./checkout-cart";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Add Field notebook, Gel pen or Slip case to a cart and pay.",
};

export default async function CheckoutPage() {
  const catalog = await getCatalog();
  const items: CheckoutItem[] = CHECKOUT_SKUS.map((sku) => {
    const { name, priceCents } = catalog.find((product) => product.sku === sku)!;
    return { sku, name, priceCents };
  });

  return (
    <>
      <h1 className={ui.pageTitle}>Checkout</h1>
      <p className={ui.pageLead}>Add items to your cart. You are charged the cart as it was when you pressed Pay.</p>
      <div className="mt-6">
        <CheckoutCart items={items} />
      </div>
    </>
  );
}
