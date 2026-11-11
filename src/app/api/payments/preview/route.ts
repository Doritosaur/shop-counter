import { previewPayment } from "@/lib/payments/payments";
import { readJson } from "@/lib/http";

export async function POST(request: Request) {
  const result = previewPayment(await readJson(request));

  switch (result.kind) {
    case "ok":
      return Response.json({ ok: true, preview: result.preview });
    // The brief: "A failure answers HTTP 400". 409 is stated only for record.
    case "invalid":
    case "sold_out":
      return Response.json({ ok: false, errors: result.errors }, { status: 400 });
  }
}
