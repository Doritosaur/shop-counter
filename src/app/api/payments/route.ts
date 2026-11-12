import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "@/lib/catalog";
import { readJson } from "@/lib/http";
import { recordPayment } from "@/lib/payments/payments";

// `{ expire: 0 }`, not `"max"`: "max" serves stale stock to the next request.
export async function POST(request: Request) {
  const result = recordPayment(await readJson(request));

  switch (result.kind) {
    case "created":
      revalidateTag(CATALOG_TAG, { expire: 0 });
      return Response.json({ replayed: false, payment: result.payment }, { status: 201 });
    case "replayed":
      return Response.json({ replayed: true, payment: result.payment }, { status: 200 });
    case "invalid":
      return Response.json({ ok: false, errors: result.errors }, { status: 400 });
    case "sold_out":
      return Response.json({ ok: false, errors: result.errors }, { status: 409 });
  }
}
