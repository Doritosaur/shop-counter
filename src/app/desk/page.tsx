import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatUsd } from "@/lib/money";
import { DESK_SKUS, seedProduct } from "@/lib/products";
import { listPayments } from "@/lib/store";
import { PaymentForm, type DeskItem } from "./payment-form";

export const metadata: Metadata = {
  title: "Desk",
  description: "Record a payment at the staff desk and see the payment queue.",
};

const DESK_ITEMS: DeskItem[] = DESK_SKUS.map((sku) => ({ sku, name: seedProduct(sku)!.name }));

export default function DeskPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Desk</h1>
      <div className="mt-6">
        <PaymentForm items={DESK_ITEMS} />
      </div>
      <section aria-labelledby="payment-queue" className="mt-10">
        <h2 id="payment-queue" className="text-lg font-semibold">
          Payment queue
        </h2>
        <Suspense fallback={<p className="mt-3">Loading payments…</p>}>
          <PaymentQueue />
        </Suspense>
      </section>
    </>
  );
}

// Renders per request; the form calls router.refresh() after recording.
async function PaymentQueue() {
  await connection();
  const payments = listPayments();

  if (payments.length === 0) {
    return <p className="mt-3">No payments recorded</p>;
  }

  return (
    <table className="mt-3 w-full text-left">
      <thead>
        <tr className="border-b border-zinc-300 dark:border-zinc-700">
          <th scope="col" className="py-2 pr-4">Email</th>
          <th scope="col" className="py-2 pr-4">Item</th>
          <th scope="col" className="py-2 pr-4">Total</th>
          <th scope="col" className="py-2">Charge id</th>
        </tr>
      </thead>
      <tbody>
        {payments.map((payment) => (
          <tr key={payment.externalChargeId} className="border-b border-zinc-200 dark:border-zinc-800">
            <td className="py-2 pr-4">{payment.email}</td>
            <td className="py-2 pr-4">{payment.itemName}</td>
            <td className="py-2 pr-4">{formatUsd(payment.totalCents)}</td>
            <td className="py-2 font-mono">{payment.externalChargeId}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
