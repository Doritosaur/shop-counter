"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  cartLines,
  cartTotal,
  sameLines,
  setQty,
  type Cart,
  type CheckoutItem,
} from "@/lib/checkout/cart";
import { formatUsd } from "@/lib/money";
import type { CheckoutAttempt, Order, OrderLine } from "@/lib/store";
import * as ui from "@/app/ui";

export const EMPTY_CART = "Add an item before paying";
export const CART_CHANGED =
  "Your cart changed after payment started. You will be charged the amount below.";
const FAILED = "Something went wrong. Try again.";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, body: await res.json() };
}

function Amount({ label, cents }: { label: string; cents: number }) {
  const id = useId();
  return (
    <p className="flex items-baseline justify-between gap-4">
      <span id={id} className={ui.muted}>
        {label}
      </span>
      <output aria-labelledby={id} className={`${ui.price} text-xl`}>
        {formatUsd(cents)}
      </output>
    </p>
  );
}

function SnapshotLines({ lines }: { lines: readonly OrderLine[] }) {
  return (
    <ul className="my-3 divide-y divide-slate-100 border-y border-slate-100 text-sm">
      {/* By position: the API keeps a repeated sku as separate lines. */}
      {lines.map((line, index) => (
        <li key={index} className="flex justify-between gap-4 py-1.5">
          <span>
            {line.name} × {line.qty}
          </span>
          <span className="font-medium tabular-nums">{formatUsd(line.unitPriceCents * line.qty)}</span>
        </li>
      ))}
    </ul>
  );
}

export function CheckoutCart({ items }: { items: CheckoutItem[] }) {
  const [cart, setCart] = useState<Cart>({});
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Set synchronously, so a double click cannot send a second request.
  const busy = useRef(false);
  // An id to focus after the next render, when the focused button goes away.
  const pendingFocus = useRef<string | null>(null);
  const baseId = useId();
  const attemptHeadingId = `${baseId}-attempt`;
  const orderHeadingId = `${baseId}-order`;
  const controlId = (sku: string, control: "name" | "add" | "increase") =>
    `${baseId}-${sku}-${control}`;

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  });

  const lines = cartLines(items, cart);
  const changed = attempt !== null && !sameLines(lines, attempt.lines);

  function changeQty(sku: string, qty: number) {
    setCart((current) => setQty(current, sku, qty));
    setNotice(null);
    if (qty < 1) pendingFocus.current = controlId(sku, "add");
  }

  function add(sku: string) {
    changeQty(sku, 1);
    pendingFocus.current = controlId(sku, "increase");
  }

  async function send(request: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setNotice(null);
    try {
      await request();
    } catch {
      setNotice(FAILED);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function onPay() {
    if (busy.current) return;
    if (lines.length === 0) {
      setNotice(EMPTY_CART);
      return;
    }
    const priced = lines.map((line) => ({
      ...line,
      unitPriceCents: items.find((item) => item.sku === line.sku)!.priceCents,
    }));
    void send(async () => {
      const { ok, body } = await postJson("/api/checkout/begin", { lines: priced });
      if (!ok) return setNotice(FAILED);
      setOrder(null);
      setAttempt(body);
      pendingFocus.current = attemptHeadingId;
    });
  }

  function onComplete() {
    if (!attempt) return;
    void send(async () => {
      const { ok, body } = await postJson("/api/checkout/complete", {
        attemptId: attempt.attemptId,
      });
      if (!ok) return setNotice(FAILED);
      setOrder(body);
      setAttempt(null);
      setCart({});
      pendingFocus.current = orderHeadingId;
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start">
      <ul aria-label="Items" className={ui.list}>
        {items.map((item) => {
          const qty = cart[item.sku] ?? 0;
          const nameId = controlId(item.sku, "name");
          return (
            <li
              key={item.sku}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex flex-col">
                <span id={nameId} className="font-medium text-blue-950">
                  {item.name}
                </span>
                <span className={ui.caption}>{formatUsd(item.priceCents)} each</span>
              </span>
              {qty === 0 ? (
                <button
                  type="button"
                  id={controlId(item.sku, "add")}
                  aria-describedby={nameId}
                  onClick={() => add(item.sku)}
                  className={`${ui.button} self-start sm:self-auto`}
                >
                  Add
                </button>
              ) : (
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease"
                    aria-describedby={nameId}
                    onClick={() => changeQty(item.sku, qty - 1)}
                    className={ui.buttonIcon}
                  >
                    −
                  </button>
                  <span className={`min-w-18 text-center ${ui.caption}`}>Quantity {qty}</span>
                  <button
                    type="button"
                    id={controlId(item.sku, "increase")}
                    aria-label="Increase"
                    aria-describedby={nameId}
                    onClick={() => changeQty(item.sku, qty + 1)}
                    className={ui.buttonIcon}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    aria-describedby={nameId}
                    onClick={() => changeQty(item.sku, 0)}
                    className="ml-1 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 underline-offset-4 hover:text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-4">
        <div className={ui.card}>
          <Amount label="Cart total" cents={cartTotal(items, cart)} />
          <button
            type="button"
            aria-disabled={pending || undefined}
            onClick={onPay}
            className={`${ui.buttonPrimary} mt-3 w-full`}
          >
            Pay
          </button>
          {/* Always rendered, so screen readers announce the message when it appears. */}
          <div role="status">
            {notice && (
              <p className={`${notice === FAILED ? ui.alertError : ui.alertWarning} mt-3`}>{notice}</p>
            )}
          </div>
        </div>

        {attempt && (
          <section aria-labelledby={attemptHeadingId} className={ui.card}>
            <h2 id={attemptHeadingId} tabIndex={-1} className={ui.cardTitle}>
              Payment in progress
            </h2>
            <SnapshotLines lines={attempt.lines} />
            <div role="status">
              {changed && <p className={`${ui.alertWarning} mb-3`}>{CART_CHANGED}</p>}
            </div>
            <Amount label="Amount due" cents={attempt.amountCents} />
            <button
              type="button"
              aria-disabled={pending || undefined}
              onClick={onComplete}
              className={`${ui.buttonPrimary} mt-3 w-full`}
            >
              Complete payment
            </button>
          </section>
        )}

        {order && (
          <section aria-labelledby={orderHeadingId} className={ui.cardSuccess}>
            <h2 id={orderHeadingId} tabIndex={-1} className={`${ui.cardTitle} flex items-center gap-2`}>
              <span
                aria-hidden="true"
                className="grid size-5 place-items-center rounded-full bg-green-100 text-xs text-green-700"
              >
                ✓
              </span>
              Order placed
            </h2>
            <p className={`mt-1 wrap-anywhere ${ui.caption}`}>Order {order.orderId}</p>
            <SnapshotLines lines={order.lines} />
            <Amount label="Amount charged" cents={order.amountCents} />
          </section>
        )}
      </div>
    </div>
  );
}
