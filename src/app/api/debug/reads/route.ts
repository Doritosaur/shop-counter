import { connection } from "next/server";
import { getCatalogReads } from "@/lib/store";

export async function GET() {
  await connection();
  return Response.json({ catalogReads: getCatalogReads() });
}
