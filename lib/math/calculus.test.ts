import { describe, expect, it } from "vitest";
import { derivativeAt, findExtrema, integrate, rootInBracket, rootNear } from "./calculus";

describe("derivativeAt", () => {
  it("differentiates smooth functions", () => {
    expect(derivativeAt((x) => x * x, 3)).toBeCloseTo(6, 10);
    expect(derivativeAt(Math.sin, 0)).toBeCloseTo(1, 10);
    expect(derivativeAt(Math.exp, 2)).toBeCloseTo(Math.exp(2), 8);
    expect(derivativeAt((x) => x ** 3, 1000)).toBeCloseTo(3e6, 0);
  });

  it("is NaN where the function is undefined nearby", () => {
    expect(derivativeAt(Math.sqrt, 0)).toBeNaN();
    expect(derivativeAt((x) => 1 / x, 0)).toBeNaN();
  });
});

describe("integrate", () => {
  it("integrates smooth functions", () => {
    expect(integrate((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 12);
    expect(integrate(Math.sin, 0, Math.PI)).toBeCloseTo(2, 12);
    expect(integrate((x) => Math.exp(-x * x), -10, 10)).toBeCloseTo(Math.sqrt(Math.PI), 10);
  });

  it("handles reversed and empty bounds", () => {
    expect(integrate((x) => x, 2, 0)).toBeCloseTo(-2, 12);
    expect(integrate((x) => x, 1, 1)).toBe(0);
  });

  it("copes with integrable endpoint singularities", () => {
    expect(integrate((x) => 1 / Math.sqrt(x), 0, 1)).toBeCloseTo(2, 5);
  });

  it("is NaN when the integrand is undefined or the bounds are infinite", () => {
    expect(integrate(Math.log, -1, 1)).toBeNaN();
    expect(integrate((x) => x, 0, Infinity)).toBeNaN();
  });
});

describe("roots", () => {
  const cubic = (x: number) => x ** 3 - 2 * x - 5;

  it("finds a root near a guess", () => {
    expect(rootNear(cubic, 2)).toBeCloseTo(2.0945514815423265, 12);
    expect(rootNear((x) => x * x - 2, 1)).toBeCloseTo(Math.SQRT2, 12);
    expect(rootNear((x) => x * x - 2, -1)).toBeCloseTo(-Math.SQRT2, 12);
    expect(rootNear(Math.cos, 1)).toBeCloseTo(Math.PI / 2, 12);
  });

  it("falls back to a sign-change search when Newton's method stalls", () => {
    // Newton's method diverges on cbrt; the search still finds 0.
    expect(rootNear(Math.cbrt, 1)).toBe(0);
  });

  it("returns null when there is no root", () => {
    expect(rootNear((x) => x * x + 1, 0)).toBeNull();
  });

  it("finds a root in a bracket and rejects poles", () => {
    expect(rootInBracket(cubic, 2, 3)).toBeCloseTo(2.0945514815423265, 12);
    expect(rootInBracket((x) => 1 / x, -1, 1)).toBeNull();
    expect(rootInBracket(cubic, 3, 4)).toBeNull();
  });
});

describe("findExtrema", () => {
  const find = (f: (x: number) => number, a = -10, b = 10) => findExtrema(f, a, b, 600, 1e-5);

  it("finds maxima and minima", () => {
    const [min] = find((x) => (x - 1) ** 2 + 3);
    expect(min.kind).toBe("min");
    expect(min.x).toBeCloseTo(1, 6);
    expect(min.y).toBeCloseTo(3, 10);

    const sine = find(Math.sin, 0, 2 * Math.PI);
    expect(sine.map((e) => e.kind)).toEqual(["max", "min"]);
    expect(sine[0].x).toBeCloseTo(Math.PI / 2, 6);
    expect(sine[1].x).toBeCloseTo((3 * Math.PI) / 2, 6);
  });

  it("finds corners such as |x|", () => {
    const [min] = find(Math.abs);
    expect(min.kind).toBe("min");
    expect(min.x).toBeCloseTo(0, 9);
    expect(min.y).toBeCloseTo(0, 9);
  });

  it("ignores monotonic functions, steps and asymptotes", () => {
    expect(find((x) => x ** 3)).toEqual([]);
    expect(find(Math.floor)).toEqual([]);
    expect(find(Math.tan, -4, 4)).toEqual([]);
    expect(find((x) => 1 / x)).toEqual([]);
  });
});
