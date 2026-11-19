import { describe, expect, it } from "vitest";
import { createScope, evaluateExpression, isBuiltInName } from "@/lib/math/engine";
import { defaultRange, equationIdentifiers, rangeIncluding, sliderVariables, snapToStep, stepFor } from "./sliders";

describe("equationIdentifiers", () => {
  it("lists names in order, marking function calls", () => {
    expect(equationIdentifiers(["y = a sin(b x)", "f(x) + a"])).toEqual([
      { name: "y", called: false },
      { name: "a", called: false },
      { name: "sin", called: true },
      { name: "b", called: false },
      { name: "x", called: false },
      { name: "f", called: true },
    ]);
  });

  it("skips exponents in numbers but keeps implied multiplication", () => {
    expect(equationIdentifiers(["2e3 x + 1.5E-2 + 2k"]).map((i) => i.name)).toEqual(["x", "k"]);
  });

  it("ignores the dy/dx of a slope field and the field() call", () => {
    expect(equationIdentifiers(["dy/dx = k x", "field(-y, a)"]).filter((i) => !i.called).map((i) => i.name)).toEqual([
      "k",
      "x",
      "y",
      "a",
    ]);
  });
});

describe("sliderVariables", () => {
  it("gives sliders to numeric user variables and lists undefined names", () => {
    const scope = createScope();
    evaluateExpression("a = 2", scope);
    evaluateExpression("f(x) = x^2", scope);
    evaluateExpression("M = [1, 2]", scope);
    const result = sliderVariables(
      ["y = a sin(b x) + f(x) + pi", "r = k theta", "(cos(t), M[1])", "y = L1[1] + undefinedFn(x)"],
      scope,
      isBuiltInName,
    );
    expect(result).toEqual({ sliders: ["a"], missing: ["b", "k"] });
  });
});

describe("ranges", () => {
  it("defaults to -10..10, or a wider range for large values", () => {
    expect(defaultRange(3)).toEqual({ min: -10, max: 10, step: 0.1 });
    expect(defaultRange(-250)).toEqual({ min: -1000, max: 1000, step: 10 });
  });

  it("widens to include a value set elsewhere", () => {
    expect(rangeIncluding({ min: -10, max: 10, step: 0.1 }, 15)).toEqual({ min: -10, max: 15, step: 0.1 });
  });

  it("chooses a step from the span", () => {
    expect(stepFor(0, 1)).toBe(0.01);
    expect(stepFor(-10, 10)).toBe(0.1);
    expect(stepFor(0, 5000)).toBe(10);
  });

  it("snaps to the step without floating-point noise", () => {
    const range = { min: -10, max: 10, step: 0.1 };
    expect(snapToStep(0.30000000000000004, range)).toBe(0.3);
    expect(snapToStep(2.04, range)).toBe(2);
    expect(snapToStep(50, range)).toBe(10);
  });
});
