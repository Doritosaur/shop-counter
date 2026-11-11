import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-4">There is nothing at this address.</p>
      <p className="mt-4">
        <Link href="/shop" className="underline">
          Back to the shop
        </Link>
      </p>
    </>
  );
}
