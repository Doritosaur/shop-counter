import { describe, expect, it } from "vitest";
import { PAYMENT_ERRORS, validatePayment } from "./validate-payment";

const valid = {
  email: "ada@example.com",
  sku: "lamp",
  externalChargeId: "ch_12345678",
  extraCode: null,
};

function errorsFor(input: unknown) {
  const result = validatePayment(input);
  return result.ok ? {} : result.errors;
}

describe("validatePayment", () => {
  it("accepts a valid payment and normalises it", () => {
    expect(validatePayment({ ...valid, email: "  Ada@Example.COM " })).toEqual({
      ok: true,
      value: {
        email: "ada@example.com",
        sku: "lamp",
        externalChargeId: "ch_12345678",
        extraCode: null,
      },
    });
  });

  it("treats an omitted extra as none", () => {
    const result = validatePayment({
      email: valid.email,
      sku: valid.sku,
      externalChargeId: valid.externalChargeId,
    });
    expect(result.ok && result.value.extraCode).toBeNull();
  });

  describe("email", () => {
    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["blank", "   "],
      ["no @", "ada.example.com"],
      ["nothing before @", "@example.com"],
      ["nothing after @", "ada@"],
      ["two @", "ada@ex@ample.com"],
      ["only spaces after @", "ada@   "],
      ["not a string", 42],
    ])("rejects %s", (_label, email) => {
      expect(errorsFor({ ...valid, email })).toEqual({ email: PAYMENT_ERRORS.email });
    });

    // The brief only asks for one @ with text on both sides, nothing stricter.
    it("accepts any text on both sides of a single @", () => {
      const result = validatePayment({ ...valid, email: "Ada Lovelace@Example" });
      expect(result.ok && result.value.email).toBe("ada lovelace@example");
    });
  });

  describe("item", () => {
    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["unknown", "chair"],
      ["a checkout item", "notebook"],
    ])("rejects %s", (_label, sku) => {
      expect(errorsFor({ ...valid, sku })).toEqual({ sku: PAYMENT_ERRORS.sku });
    });

    it("accepts the stool", () => {
      expect(validatePayment({ ...valid, sku: "stool" }).ok).toBe(true);
    });
  });

  describe("charge id", () => {
    it.each([
      ["missing", undefined],
      ["wrong prefix", "py_12345678"],
      ["too short", "ch_1234567"],
      ["symbols", "ch_1234-5678"],
      ["uppercase prefix", "CH_12345678"],
      ["leading space", " ch_12345678"],
      ["trailing space", "ch_12345678 "],
    ])("rejects %s", (_label, externalChargeId) => {
      expect(errorsFor({ ...valid, externalChargeId })).toEqual({
        externalChargeId: PAYMENT_ERRORS.externalChargeId,
      });
    });

    it("accepts letters and digits of 8 or more", () => {
      expect(validatePayment({ ...valid, externalChargeId: "ch_AbC123xyz9" }).ok).toBe(true);
    });
  });

  describe("extra", () => {
    it("accepts cushion with the stool", () => {
      const result = validatePayment({ ...valid, sku: "stool", extraCode: "cushion" });
      expect(result.ok && result.value.extraCode).toBe("cushion");
    });

    it("rejects cushion on the lamp", () => {
      expect(errorsFor({ ...valid, sku: "lamp", extraCode: "cushion" })).toEqual({
        extraCode: PAYMENT_ERRORS.extraCode,
      });
    });

    it.each([["blanket"], [""], [5]])("rejects unknown extra %j", (extraCode) => {
      expect(errorsFor({ ...valid, sku: "stool", extraCode })).toEqual({
        extraCode: PAYMENT_ERRORS.extraCode,
      });
    });

    it("reports a bad pairing together with other field errors", () => {
      expect(errorsFor({ ...valid, email: "nope", extraCode: "cushion" })).toEqual({
        email: PAYMENT_ERRORS.email,
        extraCode: PAYMENT_ERRORS.extraCode,
      });
    });

    it("does not judge the pairing when the item is invalid", () => {
      expect(errorsFor({ ...valid, sku: "chair", extraCode: "cushion" })).toEqual({
        sku: PAYMENT_ERRORS.sku,
      });
    });

    it("rejects an unknown extra even when the item is invalid", () => {
      expect(errorsFor({ ...valid, sku: undefined, extraCode: "bogus" })).toEqual({
        sku: PAYMENT_ERRORS.sku,
        extraCode: PAYMENT_ERRORS.extraCode,
      });
    });
  });

  it("lists only the fields that failed", () => {
    expect(Object.keys(errorsFor({ ...valid, sku: "chair" }))).toEqual(["sku"]);
  });

  it.each([[null], [undefined], ["text"], [[]]])("reports every required field for %j", (input) => {
    expect(errorsFor(input)).toEqual({
      email: PAYMENT_ERRORS.email,
      sku: PAYMENT_ERRORS.sku,
      externalChargeId: PAYMENT_ERRORS.externalChargeId,
    });
  });
});
