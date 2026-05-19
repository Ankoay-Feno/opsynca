import { describe, expect, it } from "vitest";

import { clampNumber, errorMessage, uniqueId } from "./utils";

describe("clampNumber", () => {
  it("clamps below min", () => {
    expect(clampNumber(-3, 1, 10)).toBe(1);
  });

  it("clamps above max", () => {
    expect(clampNumber(99, 1, 10)).toBe(10);
  });

  it("returns value when within range", () => {
    expect(clampNumber(5, 1, 10)).toBe(5);
  });

  it("returns min when value is NaN", () => {
    expect(clampNumber(Number.NaN, 2, 10)).toBe(2);
  });
});

describe("errorMessage", () => {
  it("returns message from Error", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns fallback for unknown errors", () => {
    expect(errorMessage("not-an-error")).toBe("Erreur inconnue.");
    expect(errorMessage(null)).toBe("Erreur inconnue.");
  });
});

describe("uniqueId", () => {
  it("returns a non-empty string", () => {
    const id = uniqueId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns different values on consecutive calls", () => {
    const a = uniqueId();
    const b = uniqueId();
    expect(a).not.toBe(b);
  });
});
