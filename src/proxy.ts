import { NextResponse, type NextRequest } from "next/server";
import { SEED_PRODUCTS } from "@/lib/products";

const KNOWN_SKUS = new Set(SEED_PRODUCTS.map((product) => product.sku));

/**
 * With Cache Components the shell is sent with a 200 before notFound() runs,
 * so unknown skus are rejected here, before rendering.
 */
export function proxy(request: NextRequest) {
  if (KNOWN_SKUS.has(skuFrom(request.nextUrl.pathname))) return NextResponse.next();

  return NextResponse.rewrite(new URL("/_not-found", request.url));
}

function skuFrom(pathname: string): string {
  const raw = pathname.slice("/shop/".length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // A malformed escape is simply not a known sku.
  }
}

export const config = {
  matcher: "/shop/:sku",
};
