import { describe, expect, it } from "vitest";
import { formatTick, niceStep } from "./gridStep";

describe("niceStep", () => {
  it("uses 1 unit when units are far enough apart", () => {
    expect(niceStep(60)).toBe(1);
  });

  it("widens to 2, 5, 10, ... as the graph zooms out", () => {
    expect(niceStep(30)).toBe(2);
    expect(niceStep(12)).toBe(5);
    expect(niceStep(6)).toBe(10);
    expect(niceStep(0.5)).toBe(100);
  });

  it("narrows to fractions as the graph zooms in", () => {
    expect(niceStep(200)).toBeCloseTo(0.5);
    expect(niceStep(1000)).toBeCloseTo(0.05);
  });

  it("falls back to 1 for invalid scales", () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(NaN)).toBe(1);
  });
});

describe("formatTick", () => {
  it("removes floating-point noise", () => {
    expect(formatTick(0.30000000000000004, 0.1)).toBe("0.3");
    expect(formatTick(-2, 1)).toBe("-2");
    expect(formatTick(1e-17, 0.1)).toBe("0");
  });

  it("uses exponents for very large or small values", () => {
    expect(formatTick(2000000, 1000000)).toBe("2e+6");
    expect(formatTick(0.00002, 0.00001)).toBe("2e-5");
  });
});
