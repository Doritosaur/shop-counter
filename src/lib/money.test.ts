import { describe, expect, it } from "vitest";
import { formatUsd } from "./money";

describe("formatUsd", () => {
  it("formats cents as whole US dollars", () => {
    expect(formatUsd(8000)).toBe("$80");
    expect(formatUsd(14500)).toBe("$145");
    expect(formatUsd(400)).toBe("$4");
  });
});
