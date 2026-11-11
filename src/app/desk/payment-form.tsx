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

  // A record response is always shown: the payment really was recorded.
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
        applyServerErrors(body.errors);
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
      <p id={`${ids[field]}-error`} className="text-sm text-red-700 dark:text-red-400">
        {error}
      </p>
    );
  }

  const inputClass = "rounded border border-zinc-400 px-3 py-2 aria-[invalid=true]:border-red-700";

  return (
    <div className="space-y-6">
      <form
        noValidate
        onSubmit={onPreview}
        onChange={() => {
          version.current += 1;
          setPreview(null);
          setOutcome(null);
        }}
        className="grid max-w-md gap-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.email} className="font-medium">
            Email
          </label>
          <input
            type="email"
            autoComplete="off"
            className={inputClass}
            {...fieldProps("email")}
            {...register("email")}
          />
          {fieldError("email")}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.sku} className="font-medium">
            Item
          </label>
          <select
            className={inputClass}
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
          <label htmlFor={ids.extraCode} className="font-medium">
            Extra
          </label>
          <select className={inputClass} {...fieldProps("extraCode")} {...register("extraCode")}>
            <option value="">None</option>
            <option value="cushion">Cushion</option>
          </select>
          {fieldError("extraCode")}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={ids.externalChargeId} className="font-medium">
            Charge id
          </label>
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            className={inputClass}
            {...fieldProps("externalChargeId")}
            {...register("externalChargeId")}
          />
          {fieldError("externalChargeId")}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            aria-disabled={isSubmitting || undefined}
            className="rounded border border-zinc-500 px-4 py-2 font-medium aria-disabled:opacity-50"
          >
            Preview
          </button>
          <button
            type="button"
            aria-disabled={isSubmitting || undefined}
            onClick={onRecord}
            className="rounded bg-zinc-900 px-4 py-2 font-medium text-white aria-disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Record payment
          </button>
        </div>
      </form>

      <div role="status" aria-live="polite">
        {outcome?.kind === "recorded" && (
          <p>
            Payment recorded: {outcome.payment.itemName} for {outcome.payment.email},{" "}
            {formatUsd(outcome.payment.totalCents)}.
          </p>
        )}
        {outcome?.kind === "replayed" && (
          <p>
            Charge {outcome.payment.externalChargeId} was already recorded:{" "}
            {outcome.payment.itemName} for {outcome.payment.email},{" "}
            {formatUsd(outcome.payment.totalCents)}. Nothing was taken off stock.
          </p>
        )}
        {outcome?.kind === "error" && <p>{outcome.message}</p>}
      </div>

      {preview && (
        <section
          aria-labelledby={ids.preview}
          className="max-w-md rounded border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <h2 id={ids.preview} className="text-lg font-semibold">
            Payment preview
          </h2>
          <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1">
            <dt className="font-medium">Email</dt>
            <dd>{preview.email}</dd>
            <dt className="font-medium">Item</dt>
            <dd>{preview.itemName}</dd>
            <dt className="font-medium">Extra</dt>
            <dd>{preview.extraName ?? "None"}</dd>
            <dt className="font-medium">Total</dt>
            <dd>{formatUsd(preview.totalCents)}</dd>
            <dt className="font-medium">Remaining after this payment</dt>
            <dd>{preview.remainingAfter ?? "Not stock-limited"}</dd>
          </dl>
        </section>
      )}
    </div>
  );
}
