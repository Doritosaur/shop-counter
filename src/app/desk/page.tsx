import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatUsd } from "@/lib/money";
import { DESK_SKUS, seedProduct } from "@/lib/products";
import { listPayments } from "@/lib/store";
import * as ui from "@/app/ui";
import { PaymentForm, type DeskItem } from "./payment-form";

export const metadata: Metadata = {
  title: "Desk",
  description: "Record a payment at the staff desk and see the payment queue.",
};

const DESK_ITEMS: DeskItem[] = DESK_SKUS.map((sku) => ({ sku, name: seedProduct(sku)!.name }));

export default function DeskPage() {
  return (
    <>
      <h1 className={ui.pageTitle}>Desk</h1>
      <p className={ui.pageLead}>Record a payment taken at the counter. Preview it first to check the total.</p>
      <div className="mt-6">
        <PaymentForm items={DESK_ITEMS} />
      </div>
      <section aria-labelledby="payment-queue" className={`${ui.card} mt-4`}>
        <h2 id="payment-queue" className={ui.cardTitle}>
          Payment queue
        </h2>
        <Suspense fallback={<p className={`mt-3 ${ui.muted}`}>Loading payments…</p>}>
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
    return <p className={`mt-3 ${ui.muted}`}>No payments recorded</p>;
  }

  return (
    <table className="mt-3 w-full text-left text-sm">
      <thead>
        <tr className={`border-b border-slate-200 ${ui.caption}`}>
          <th scope="col" className="py-2 pr-3 font-medium">Email</th>
          <th scope="col" className="py-2 pr-3 font-medium">Item</th>
          <th scope="col" className="py-2 pr-3 font-medium">Total</th>
          <th scope="col" className="py-2 font-medium">Charge id</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {payments.map((payment) => (
          <tr key={payment.externalChargeId}>
            <td className="py-2 pr-3 wrap-anywhere">{payment.email}</td>
            <td className="py-2 pr-3">{payment.itemName}</td>
            <td className="py-2 pr-3 font-medium">{formatUsd(payment.totalCents)}</td>
            <td className="py-2 font-mono text-xs wrap-anywhere">{payment.externalChargeId}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
