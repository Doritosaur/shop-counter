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
    <p className="flex gap-2 font-medium">
      <span id={id}>{label}</span>
      <output aria-labelledby={id}>{formatUsd(cents)}</output>
    </p>
  );
}

function SnapshotLines({ lines }: { lines: readonly OrderLine[] }) {
  return (
    <ul className="my-3 space-y-1">
      {lines.map((line) => (
        <li key={line.sku}>
          {line.name} × {line.qty}, {formatUsd(line.unitPriceCents * line.qty)}
        </li>
      ))}
    </ul>
  );
}

const buttonClass = "rounded border border-zinc-500 px-3 py-1 font-medium aria-disabled:opacity-50";
const primaryClass =
  "rounded bg-zinc-900 px-4 py-2 font-medium text-white aria-disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

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
    <div className="space-y-8">
      <div className="space-y-4">
        <ul aria-label="Items" className="divide-y divide-zinc-300 dark:divide-zinc-700">
          {items.map((item) => {
            const qty = cart[item.sku] ?? 0;
            const nameId = controlId(item.sku, "name");
            return (
              <li key={item.sku} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span>
                  <span id={nameId} className="font-medium">
                    {item.name}
                  </span>{" "}
                  {formatUsd(item.priceCents)}
                </span>
                {qty === 0 ? (
                  <button
                    type="button"
                    id={controlId(item.sku, "add")}
                    aria-describedby={nameId}
                    onClick={() => add(item.sku)}
                    className={buttonClass}
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
                      className={buttonClass}
                    >
                      −
                    </button>
                    <span>Quantity {qty}</span>
                    <button
                      type="button"
                      id={controlId(item.sku, "increase")}
                      aria-label="Increase"
                      aria-describedby={nameId}
                      onClick={() => changeQty(item.sku, qty + 1)}
                      className={buttonClass}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      aria-describedby={nameId}
                      onClick={() => changeQty(item.sku, 0)}
                      className={buttonClass}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <Amount label="Cart total" cents={cartTotal(items, cart)} />

        <div className="flex flex-wrap items-center gap-4">
          <button type="button" aria-disabled={pending || undefined} onClick={onPay} className={primaryClass}>
            Pay
          </button>
          <p role="status">{notice}</p>
        </div>
      </div>

      {attempt && (
        <section
          aria-labelledby={attemptHeadingId}
          className="max-w-md rounded border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <h2 id={attemptHeadingId} tabIndex={-1} className="text-lg font-semibold">
            Payment in progress
          </h2>
          <SnapshotLines lines={attempt.lines} />
          <p role="status" className="mb-3">
            {changed ? CART_CHANGED : null}
          </p>
          <Amount label="Amount due" cents={attempt.amountCents} />
          <button
            type="button"
            aria-disabled={pending || undefined}
            onClick={onComplete}
            className={`${primaryClass} mt-4`}
          >
            Complete payment
          </button>
        </section>
      )}

      {order && (
        <section
          aria-labelledby={orderHeadingId}
          className="max-w-md rounded border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <h2 id={orderHeadingId} tabIndex={-1} className="text-lg font-semibold">
            Order placed
          </h2>
          <p className="mt-1 text-sm">Order {order.orderId}</p>
          <SnapshotLines lines={order.lines} />
          <Amount label="Amount charged" cents={order.amountCents} />
        </section>
      )}
    </div>
  );
}
