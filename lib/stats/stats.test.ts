import { describe, expect, it } from "vitest";
import { fitRegression, formatCoefficient, parseList, summarize, type Fit } from "./stats";

function fit(xs: number[], ys: number[], model: Parameters<typeof fitRegression>[2]): Fit {
  const result = fitRegression(xs, ys, model);
  if (!result.ok) throw new Error(result.error);
  return result.fit;
}

describe("parseList", () => {
  it("reads numbers with mixed separators and reports bad tokens", () => {
    expect(parseList("1, 2 3;4\n5e1 -6.5")).toEqual({ values: [1, 2, 3, 4, 50, -6.5], invalid: [] });
    expect(parseList("1, two, 3")).toEqual({ values: [1, 3], invalid: ["two"] });
    expect(parseList("   ")).toEqual({ values: [], invalid: [] });
  });
});

describe("summarize", () => {
  it("computes one-variable statistics with TI-84 quartiles", () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9])!;
    expect(s.n).toBe(8);
    expect(s.mean).toBe(5);
    expect(s.populationSD).toBe(2);
    expect(s.sampleSD).toBeCloseTo(2.138089935, 9);
    expect([s.min, s.q1, s.median, s.q3, s.max]).toEqual([2, 4, 4.5, 6, 9]);
  });

  it("excludes the median from the halves when n is odd", () => {
    const s = summarize([1, 2, 3, 4, 5, 6, 7])!;
    expect([s.q1, s.median, s.q3]).toEqual([2, 4, 6]);
  });

  it("handles one value and no values", () => {
    expect(summarize([3])!.sampleSD).toBeNaN();
    expect(summarize([])).toBeNull();
  });
});

describe("fitRegression", () => {
  it("fits an exact line", () => {
    const line = fit([1, 2, 3, 4], [3, 5, 7, 9], "linear");
    expect(line.coefficients.map((c) => c.value)).toEqual([2, 1]);
    expect(line.r2).toBe(1);
    expect(line.expression).toBe("2*x + 1");
  });

  it("writes negative terms with a minus sign", () => {
    expect(fit([0, 1, 2], [1, -1, -3], "linear").expression).toBe("-2*x + 1");
    expect(fit([0, 1, 2], [-1, 1, 3], "linear").expression).toBe("2*x - 1");
  });

  it("fits quadratic, exponential, power and logarithmic models", () => {
    const xs = [1, 2, 3, 4, 5];
    const quad = fit(xs, xs.map((x) => 2 * x * x - 3 * x + 1), "quadratic");
    expect(quad.expression).toBe("2*x^2 - 3*x + 1");
    const exp = fit(xs, xs.map((x) => 3 * 2 ** x), "exponential");
    expect(exp.expression).toBe("3*2^x");
    const power = fit(xs, xs.map((x) => 5 * x ** -1.5), "power");
    expect(power.expression).toBe("5*x^(-1.5)");
    const log = fit(xs, xs.map((x) => 1 + 2 * Math.log(x)), "logarithmic");
    expect(log.expression).toBe("1 + 2*log(x)");
    expect(log.r2).toBeCloseTo(1, 12);
  });

  it("reports an r² below 1 for noisy data", () => {
    const noisy = fit([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1], "linear");
    expect(noisy.r2).toBeGreaterThan(0.99);
    expect(noisy.r2).toBeLessThan(1);
  });

  it("explains why a fit is impossible", () => {
    const fail = (xs: number[], ys: number[], model: Parameters<typeof fitRegression>[2]) => {
      const r = fitRegression(xs, ys, model);
      return r.ok ? "" : r.error;
    };
    expect(fail([1, 2], [1], "linear")).toContain("L1 has 2 values but L2 has 1");
    expect(fail([1, 2], [1, 2], "quadratic")).toContain("at least 3");
    expect(fail([1, 1, 1], [1, 2, 3], "linear")).toContain("same");
    expect(fail([1, 2], [1, -2], "exponential")).toContain("y > 0");
    expect(fail([0, 2], [1, 2], "logarithmic")).toContain("x > 0");
  });
});

describe("formatCoefficient", () => {
  it("keeps six significant digits", () => {
    expect(formatCoefficient(1.23456789)).toBe("1.23457");
    expect(formatCoefficient(1e-15)).toBe("0");
  });
});
