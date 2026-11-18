import { describe, expect, it } from "vitest";
import { binomcdf, binompdf, invNorm, normalcdf, normalpdf, poissoncdf, poissonpdf } from "./distributions";

describe("normal distribution", () => {
  it("matches standard values", () => {
    expect(normalpdf(0)).toBeCloseTo(0.398942280401, 12);
    expect(normalcdf(-1, 1)).toBeCloseTo(0.682689492137, 12);
    expect(normalcdf(-Infinity, 1.96)).toBeCloseTo(0.975002104852, 12);
    expect(normalcdf(-1e99, 100, 100, 15)).toBeCloseTo(0.5, 12);
  });

  it("inverts the CDF to full precision", () => {
    expect(invNorm(0.975)).toBeCloseTo(1.959963984540, 10);
    expect(invNorm(0.5, 100, 15)).toBeCloseTo(100, 10);
    expect(invNorm(0.001)).toBeCloseTo(-3.090232306168, 9);
  });

  it("rejects invalid parameters", () => {
    expect(() => normalpdf(0, 0, 0)).toThrow("σ");
    expect(() => invNorm(1)).toThrow("strictly between");
  });
});

describe("binomial distribution", () => {
  it("computes point and cumulative probabilities", () => {
    expect(binompdf(10, 0.5, 5)).toBeCloseTo(0.24609375, 12);
    expect(binomcdf(10, 0.5, 5)).toBeCloseTo(0.623046875, 12);
    expect(binompdf(10, 0.5, 11)).toBe(0);
    expect(binompdf(5, 0, 0)).toBe(1);
    expect(binomcdf(10, 0.3, 10)).toBeCloseTo(1, 12);
  });

  it("handles large n without overflow", () => {
    expect(binompdf(1000, 0.5, 500)).toBeCloseTo(0.025225018178, 10);
  });

  it("rejects invalid parameters", () => {
    expect(() => binompdf(2.5, 0.5, 1)).toThrow("whole number");
    expect(() => binompdf(10, 1.5, 1)).toThrow("between 0 and 1");
  });
});

describe("Poisson distribution", () => {
  it("computes point and cumulative probabilities", () => {
    expect(poissonpdf(3, 2)).toBeCloseTo(0.224041807655, 12);
    expect(poissoncdf(3, 2)).toBeCloseTo(0.423190081127, 12);
    expect(poissonpdf(3, -1)).toBe(0);
  });
});
