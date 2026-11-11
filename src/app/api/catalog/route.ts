import { connection } from "next/server";
import { listProducts } from "@/lib/store";

// Without connection(), Cache Components would prerender this at build time.
export async function GET() {
  await connection();
  return Response.json(listProducts());
}
