import { describe, expect, it } from "vitest";
import { toExactForm, toFraction } from "./exact";

const text = (v: number) => toExactForm(v)?.text ?? null;

describe("toFraction", () => {
  it("finds simple fractions and rejects irrational values", () => {
    expect(toFraction(0.75, 100)).toEqual([3, 4]);
    expect(toFraction(-1 / 3, 100)).toEqual([-1, 3]);
    expect(toFraction(0.1 + 0.2, 100)).toEqual([3, 10]);
    expect(toFraction(Math.SQRT2, 10000)).toBeNull();
    expect(toFraction(Math.PI, 10000)).toBeNull();
  });
});

describe("toExactForm", () => {
  it("shows fractions", () => {
    expect(text(1 / 3)).toBe("1/3");
    expect(text(-5 / 8)).toBe("-5/8");
    expect(toExactForm(2 / 3)?.tex).toBe("\\frac{2}{3}");
  });

  it("shows rational multiples of square roots", () => {
    expect(text(Math.SQRT2)).toBe("√2");
    expect(text(3 * Math.SQRT2)).toBe("3√2");
    expect(text(Math.SQRT2 / 2)).toBe("√2/2");
    expect(text(Math.sqrt(3) / 2)).toBe("√3/2");
    expect(text(-Math.sqrt(12))).toBe("-2√3");
    expect(toExactForm(Math.sqrt(3) / 2)?.tex).toBe("\\frac{\\sqrt{3}}{2}");
  });

  it("shows rational multiples of pi", () => {
    expect(text(Math.PI)).toBe("π");
    expect(text(Math.PI / 4)).toBe("π/4");
    expect(text((-3 * Math.PI) / 2)).toBe("-3π/2");
  });

  it("returns null for integers, non-numbers and values with no simple form", () => {
    expect(toExactForm(42)).toBeNull();
    expect(toExactForm(Math.E)).toBeNull();
    expect(toExactForm(Math.log(2))).toBeNull();
    expect(toExactForm("1/2")).toBeNull();
    expect(toExactForm(NaN)).toBeNull();
  });
});
