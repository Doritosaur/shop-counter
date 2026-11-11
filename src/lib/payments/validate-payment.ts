import { z } from "zod";
import { DESK_SKUS, seedProduct, type DeskSku } from "@/lib/products";

export const PAYMENT_ERRORS = {
  email: "Enter a valid email",
  sku: "Choose an item",
  externalChargeId: "Enter a charge id like ch_12345678",
  extraCode: "That extra is not sold with this item",
} as const;

export type PaymentField = keyof typeof PAYMENT_ERRORS;
export type PaymentErrors = Partial<Record<PaymentField, string>>;

export type PaymentInput = {
  email: string;
  sku: DeskSku;
  externalChargeId: string;
  extraCode: string | null;
};

export type PaymentValidation =
  | { ok: true; value: PaymentInput }
  | { ok: false; errors: PaymentErrors };

// The brief trims the email only, so the charge id is matched as sent.
const CHARGE_ID = /^ch_[A-Za-z0-9]{8,}$/;
const EMAIL = /^[^@]+@[^@]+$/;
const EXTRA_CODES = new Set(DESK_SKUS.flatMap((sku) => seedProduct(sku)!.extras.map((e) => e.code)));

const fieldsSchema = z.object({
  email: z
    .string({ error: PAYMENT_ERRORS.email })
    .trim()
    .toLowerCase()
    .regex(EMAIL, { error: PAYMENT_ERRORS.email }),
  sku: z.enum(DESK_SKUS, { error: PAYMENT_ERRORS.sku }),
  externalChargeId: z
    .string({ error: PAYMENT_ERRORS.externalChargeId })
    .regex(CHARGE_ID, { error: PAYMENT_ERRORS.externalChargeId }),
  extraCode: z
    .string({ error: PAYMENT_ERRORS.extraCode })
    .refine((code) => EXTRA_CODES.has(code), { error: PAYMENT_ERRORS.extraCode })
    .nullish(),
});

const FIELDS = Object.keys(PAYMENT_ERRORS) as PaymentField[];

function isField(key: unknown): key is PaymentField {
  return FIELDS.includes(key as PaymentField);
}

function isExtraSoldWith(sku: DeskSku, extraCode: string): boolean {
  return seedProduct(sku)?.extras.some((extra) => extra.code === extraCode) ?? false;
}

export function validatePayment(input: unknown): PaymentValidation {
  // A non-object body counts as an empty form, so every field reports.
  const raw = typeof input === "object" && input !== null && !Array.isArray(input) ? input : {};
  const parsed = fieldsSchema.safeParse(raw);
  const errors: PaymentErrors = {};

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (isField(field)) errors[field] ??= issue.message;
    }
  }

  // Checked outside the schema so it is reported alongside other field errors.
  const sku = fieldsSchema.shape.sku.safeParse((raw as { sku?: unknown }).sku);
  const extraCode = parsed.success
    ? parsed.data.extraCode
    : (raw as { extraCode?: unknown }).extraCode;
  if (
    !errors.extraCode &&
    sku.success &&
    typeof extraCode === "string" &&
    !isExtraSoldWith(sku.data, extraCode)
  ) {
    errors.extraCode = PAYMENT_ERRORS.extraCode;
  }

  if (!parsed.success || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      email: parsed.data.email,
      sku: parsed.data.sku,
      externalChargeId: parsed.data.externalChargeId,
      extraCode: parsed.data.extraCode ?? null,
    },
  };
}
