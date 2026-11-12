export type CheckoutItem = { sku: string; name: string; priceCents: number };

export type Cart = Readonly<Record<string, number>>;

export type CartLine = { sku: string; qty: number };

export function cartLines(items: readonly CheckoutItem[], cart: Cart): CartLine[] {
  return items.filter((item) => cart[item.sku]).map((item) => ({ sku: item.sku, qty: cart[item.sku] }));
}

export function cartTotal(items: readonly CheckoutItem[], cart: Cart): number {
  return items.reduce((sum, item) => sum + item.priceCents * (cart[item.sku] ?? 0), 0);
}

export function setQty(cart: Cart, sku: string, qty: number): Cart {
  if (qty >= 1) return { ...cart, [sku]: qty };
  return Object.fromEntries(Object.entries(cart).filter(([key]) => key !== sku));
}

export function sameLines(a: readonly CartLine[], b: readonly CartLine[]): boolean {
  const key = (lines: readonly CartLine[]) =>
    lines
      .map((line) => `${line.sku}:${line.qty}`)
      .sort()
      .join(",");
  return key(a) === key(b);
}
