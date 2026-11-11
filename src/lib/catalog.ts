import { cacheLife, cacheTag } from "next/cache";
import { listProducts, recordCatalogRead, type Product } from "./store";

export const CATALOG_TAG = "catalog";

/** Counts inside the cached body, so cache hits are not counted. */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("max");

  recordCatalogRead();
  return listProducts();
}
