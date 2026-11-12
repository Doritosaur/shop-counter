import type { Metadata } from "next";
import Link from "next/link";
import * as ui from "@/app/ui";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <div className={`${ui.card} mx-auto max-w-md text-center`}>
      <p className="text-sm font-semibold text-blue-700">404</p>
      <h1 className={`mt-1 ${ui.pageTitle}`}>Not found</h1>
      <p className={`mt-2 ${ui.muted}`}>There is nothing at this address.</p>
      <p className="mt-4">
        <Link href="/shop" className={ui.buttonPrimary}>
          Back to the shop
        </Link>
      </p>
    </div>
  );
}
