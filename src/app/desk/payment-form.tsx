"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { useForm, type FieldErrors, type Resolver } from "react-hook-form";
import { formatUsd } from "@/lib/money";
import type { PaymentPreview } from "@/lib/payments/payments";
import {
  validatePayment,
  type PaymentErrors,
  type PaymentField,
} from "@/lib/payments/validate-payment";
import { seedProduct } from "@/lib/products";
import type { Payment } from "@/lib/store";
import * as ui from "@/app/ui";

export type DeskItem = { sku: string; name: string };

type FormValues = {
  email: string;
  sku: string;
  extraCode: string;
  externalChargeId: string;
};

const EMPTY: FormValues = { email: "", sku: "", extraCode: "", externalChargeId: "" };

function toPaymentInput(values: FormValues) {
  return {
    email: values.email,
    sku: values.sku,
    externalChargeId: values.externalChargeId,
    extraCode: values.extraCode === "" ? null : values.extraCode,
  };
}

function toFieldErrors(errors: PaymentErrors): FieldErrors<FormValues> {
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [field, { type: "validate", message }]),
  );
}

const resolver: Resolver<FormValues> = async (values) => {
  const result = validatePayment(toPaymentInput(values));
  return result.ok ? { values, errors: {} } : { values: {}, errors: toFieldErrors(result.errors) };
};

type Outcome =
  | { kind: "recorded"; payment: Payment }
  | { kind: "replayed"; payment: Payment }
  | { kind: "error"; message: string }
  | null;

const FAILED = "Something went wrong. Try again.";

export function PaymentForm({ items }: { items: DeskItem[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<PaymentPreview | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  // Bumped on every edit, so a response for values no longer in the form is dropped.
  const version = useRef(0);
  // Set synchronously, so a double click cannot send a second request.
  const submitting = useRef(false);
  const ids = {
    email: useId(),
    sku: useId(),
    extraCode: useId(),
    externalChargeId: useId(),
    preview: useId(),
  };

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    formState: { errors, isSubmitted, isSubmitting },
  } = useForm<FormValues>({ defaultValues: EMPTY, resolver });

  function applyServerErrors(serverErrors: PaymentErrors) {
    for (const [field, message] of Object.entries(serverErrors)) {
      setError(field as PaymentField, { type: "server", message }, { shouldFocus: true });
    }
  }

  async function post(url: string, values: FormValues) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPaymentInput(values)),
    });
    return { status: res.status, body: await res.json() };
  }

  async function run(action: (isCurrent: () => boolean) => Promise<void>) {
    const started = version.current;
    setOutcome(null);
    try {
      await action(() => version.current === started);
    } catch {
      setOutcome({ kind: "error", message: FAILED });
    }
  }

  async function submitOnce(onValid: (values: FormValues) => Promise<void>) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await handleSubmit(onValid)();
    } finally {
      submitting.current = false;
    }
  }

  const requestPreview = (values: FormValues) =>
    run(async (isCurrent) => {
      setPreview(null);
      const { status, body } = await post("/api/payments/preview", values);
      if (!isCurrent()) return;
      if (status === 200) setPreview(body.preview);
      else if (body.errors) applyServerErrors(body.errors);
      else setOutcome({ kind: "error", message: FAILED });
    });

  // A recorded or replayed payment is always shown: it really happened.
  // Field errors are dropped once the form was edited, as they describe old values.
  const requestRecord = (values: FormValues) =>
    run(async (isCurrent) => {
      setPreview(null);
      const { status, body } = await post("/api/payments", values);
      if (status === 201) {
        setOutcome({ kind: "recorded", payment: body.payment });
        if (isCurrent()) reset(EMPTY);
      } else if (status === 200 && body.replayed) {
        setOutcome({ kind: "replayed", payment: body.payment });
      } else if (body.errors) {
        if (isCurrent()) applyServerErrors(body.errors);
      } else {
        setOutcome({ kind: "error", message: FAILED });
      }
      router.refresh();
    });

  function onPreview(event: React.FormEvent) {
    event.preventDefault();
    void submitOnce(requestPreview);
  }

  function onRecord() {
    void submitOnce(requestRecord);
  }

  function onItemChange(sku: string) {
    const extra = getValues("extraCode");
    const product = seedProduct(sku);
    if (extra && product && !product.extras.some((e) => e.code === extra)) {
      setValue("extraCode", "", { shouldValidate: isSubmitted });
    }
  }

  function fieldProps(field: PaymentField) {
    const error = errors[field]?.message;
    return {
      id: ids[field],
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error ? `${ids[field]}-error` : undefined,
    };
  }

  function fieldError(field: PaymentField) {
    const error = errors[field]?.message;
    if (!error) return null;
    return (
      <p id={`${ids[field]}-error`} className={ui.fieldError}>
        {error}
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <form
        noValidate
        onSubmit={onPreview}
        onChange={() => {
          version.current += 1;
          setPreview(null);
          setOutcome(null);
        }}
        className={`${ui.card} grid gap-3 sm:grid-cols-2`}
      >
        <h2 className={`${ui.cardTitle} sm:col-span-2`}>Record a payment</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.email} className={ui.label}>
            Email
          </label>
          <input
            type="email"
            autoComplete="off"
            className={ui.input}
            {...fieldProps("email")}
            {...register("email")}
          />
          {fieldError("email")}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.sku} className={ui.label}>
            Item
          </label>
          <select
            className={ui.input}
            {...fieldProps("sku")}
            {...register("sku", { onChange: (event) => onItemChange(event.target.value) })}
          >
            <option value="">Choose…</option>
            {items.map((item) => (
              <option key={item.sku} value={item.sku}>
                {item.name}
              </option>
            ))}
          </select>
          {fieldError("sku")}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.extraCode} className={ui.label}>
            Extra
          </label>
          <select className={ui.input} {...fieldProps("extraCode")} {...register("extraCode")}>
            <option value="">None</option>
            <option value="cushion">Cushion</option>
          </select>
          {fieldError("extraCode")}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.externalChargeId} className={ui.label}>
            Charge id
          </label>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={ui.input}
            {...fieldProps("externalChargeId")}
            {...register("externalChargeId")}
          />
          {fieldError("externalChargeId")}
        </div>

        <div className="flex flex-wrap gap-2 pt-1 sm:col-span-2">
          <button type="submit" aria-disabled={isSubmitting || undefined} className={ui.button}>
            Preview
          </button>
          <button
            type="button"
            aria-disabled={isSubmitting || undefined}
            onClick={onRecord}
            className={ui.buttonPrimary}
          >
            Record payment
          </button>
        </div>
      </form>

      <div>
        {/* Always rendered, so screen readers announce the outcome when it appears. */}
        <div role="status" aria-live="polite">
          {outcome?.kind === "recorded" && (
            <p className={`${ui.alertSuccess} mb-3`}>
              Payment recorded: {outcome.payment.itemName} for {outcome.payment.email},{" "}
              {formatUsd(outcome.payment.totalCents)}.
            </p>
          )}
          {outcome?.kind === "replayed" && (
            <p className={`${ui.alertInfo} mb-3`}>
              Charge {outcome.payment.externalChargeId} was already recorded:{" "}
              {outcome.payment.itemName} for {outcome.payment.email},{" "}
              {formatUsd(outcome.payment.totalCents)}. Nothing was taken off stock.
            </p>
          )}
          {outcome?.kind === "error" && <p className={`${ui.alertError} mb-3`}>{outcome.message}</p>}
        </div>

        {preview ? (
          <section aria-labelledby={ids.preview} className={ui.card}>
            <h2 id={ids.preview} className={ui.cardTitle}>
              Payment preview
            </h2>
            <dl className={`${ui.detailList} mt-3`}>
              {[
                ["Email", preview.email],
                ["Item", preview.itemName],
                ["Extra", preview.extraName ?? "None"],
                ["Total", formatUsd(preview.totalCents)],
                ["Remaining after this payment", preview.remainingAfter ?? "Not stock-limited"],
              ].map(([term, value]) => (
                <div key={term} className="flex justify-between gap-4 py-2">
                  <dt className="text-slate-600">{term}</dt>
                  <dd className="text-right font-medium text-blue-950 wrap-anywhere">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : (
          <p className={`rounded-xl border border-dashed border-slate-300 p-5 ${ui.muted}`}>
            Preview a payment to check its total and the stock left before recording it.
          </p>
        )}
      </div>
    </div>
  );
}
