import { beginCheckout } from "@/lib/checkout/checkout";
import { readJson } from "@/lib/http";

export async function POST(request: Request) {
  const result = beginCheckout(await readJson(request));

  if (result.kind === "invalid_cart") {
    return Response.json({ error: "invalid_cart" }, { status: 400 });
  }
  return Response.json(result.attempt);
}
