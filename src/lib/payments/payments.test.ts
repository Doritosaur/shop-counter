import { beforeEach, describe, expect, it } from "vitest";
import { findProduct, listPayments, resetStore } from "@/lib/store";
import { previewPayment, recordPayment } from "./payments";
import { PAYMENT_ERRORS } from "./validate-payment";

const lamp = {
  email: "ada@example.com",
  sku: "lamp",
  externalChargeId: "ch_12345678",
  extraCode: null,
};
const stoolWithCushion = {
  email: "grace@example.com",
  sku: "stool",
  externalChargeId: "ch_stool0001",
  extraCode: "cushion",
};

beforeEach(() => {
  resetStore();
});

describe("previewPayment", () => {
  it("returns the preview from the brief", () => {
    expect(previewPayment(lamp)).toEqual({
      kind: "ok",
      preview: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        extraName: null,
        totalCents: 8000,
        remainingAfter: 4,
      },
    });
  });

  it("prices the extra", () => {
    const result = previewPayment(stoolWithCushion);
    expect(result.kind === "ok" && result.preview).toMatchObject({
      extraCode: "cushion",
      extraName: "Cushion",
      totalCents: 14500,
      remainingAfter: 1,
    });
  });

  it("writes nothing", () => {
    previewPayment(lamp);
    previewPayment(lamp);
    expect(findProduct("lamp")?.remaining).toBe(5);
    expect(listPayments()).toEqual([]);
  });

  it("returns field errors", () => {
    expect(previewPayment({ ...lamp, email: "nope" })).toEqual({
      kind: "invalid",
      errors: { email: PAYMENT_ERRORS.email },
    });
  });

  it("reports sold out", () => {
    recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0001" });
    recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0002" });
    expect(previewPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0003" })).toEqual({
      kind: "sold_out",
      errors: { sku: "Sold out" },
    });
  });
});

describe("recordPayment", () => {
  it("records the payment from the brief and takes one off remaining", () => {
    expect(recordPayment({ ...lamp, email: " Ada@Example.com " })).toEqual({
      kind: "created",
      payment: {
        email: "ada@example.com",
        sku: "lamp",
        itemName: "Maple lamp",
        extraCode: null,
        externalChargeId: "ch_12345678",
        totalCents: 8000,
      },
    });
    expect(findProduct("lamp")?.remaining).toBe(4);
    expect(listPayments()).toHaveLength(1);
  });

  it("replays the same charge id without taking stock again", () => {
    recordPayment(lamp);
    const replay = recordPayment(lamp);

    expect(replay.kind).toBe("replayed");
    expect(findProduct("lamp")?.remaining).toBe(4);
    expect(listPayments()).toHaveLength(1);
  });

  it("replays the original sku and total even if the body changes", () => {
    recordPayment(lamp);
    const replay = recordPayment({
      ...stoolWithCushion,
      externalChargeId: lamp.externalChargeId,
    });

    expect(replay).toEqual({
      kind: "replayed",
      payment: expect.objectContaining({ sku: "lamp", totalCents: 8000, email: "ada@example.com" }),
    });
    expect(findProduct("stool")?.remaining).toBe(2);
    expect(findProduct("lamp")?.remaining).toBe(4);
  });

  it("allows a second new charge for the same email and sku", () => {
    recordPayment(lamp);
    const second = recordPayment({ ...lamp, externalChargeId: "ch_87654321" });

    expect(second.kind).toBe("created");
    expect(findProduct("lamp")?.remaining).toBe(3);
  });

  it("answers sold out at zero and records nothing", () => {
    recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0001" });
    recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0002" });
    const third = recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0003" });

    expect(third).toEqual({ kind: "sold_out", errors: { sku: "Sold out" } });
    expect(findProduct("stool")?.remaining).toBe(0);
    expect(listPayments()).toHaveLength(2);
  });

  it("still replays a recorded charge after the item sells out", () => {
    recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0001" });
    recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0002" });

    expect(recordPayment({ ...stoolWithCushion, externalChargeId: "ch_stool0001" }).kind).toBe(
      "replayed",
    );
  });

  it("rejects invalid input without writing", () => {
    expect(recordPayment({ ...lamp, extraCode: "cushion" })).toEqual({
      kind: "invalid",
      errors: { extraCode: PAYMENT_ERRORS.extraCode },
    });
    expect(findProduct("lamp")?.remaining).toBe(5);
    expect(listPayments()).toEqual([]);
  });
});
