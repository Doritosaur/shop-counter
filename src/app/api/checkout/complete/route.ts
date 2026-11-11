import { completeCheckout } from "@/lib/checkout/checkout";
import { readJson } from "@/lib/http";

// Only attemptId is read. Any lines in the body are ignored.
export async function POST(request: Request) {
  const body = (await readJson(request)) as { attemptId?: unknown } | null;
  const result = completeCheckout(body?.attemptId);

  if (result.kind === "unknown_attempt") {
    return Response.json({ error: "unknown_attempt" }, { status: 404 });
  }
  return Response.json(result.order);
}
