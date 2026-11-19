import { describe, expect, it } from "vitest";
import { compileFunction, createScope, evaluateExpression, type AngleMode, type Scope } from "./engine";

function value(expr: string, scope: Scope = createScope(), mode: AngleMode = "rad"): number {
  const result = evaluateExpression(expr, scope, mode);
  if (!result.ok) throw new Error(result.error);
  return result.value as number;
}

function error(expr: string): string {
  const result = evaluateExpression(expr, createScope());
  return result.ok ? "" : result.error;
}

describe("nDeriv", () => {
  it("differentiates an expression at a point", () => {
    expect(value("nDeriv(x^2, x, 3)")).toBeCloseTo(6, 10);
    expect(value("nDeriv(sin(t), t, 0)")).toBeCloseTo(1, 10);
    expect(value("nDeriv(e^x, x, 1)")).toBeCloseTo(Math.E, 9);
  });

  it("uses variables and functions from the scope", () => {
    const scope = createScope();
    value("a = 3", scope);
    value("f(x) = a x^2", scope);
    expect(value("nDeriv(f(x), x, 2)", scope)).toBeCloseTo(12, 9);
    // The bound variable doesn't leak into or overwrite the scope.
    value("x = 100", scope);
    expect(value("nDeriv(x^2, x, 1)", scope)).toBeCloseTo(2, 9);
    expect(scope.get("x")).toBe(100);
  });

  it("follows the angle mode", () => {
    expect(value("nDeriv(sin(x), x, 0)", createScope(), "deg")).toBeCloseTo(Math.PI / 180, 10);
  });

  it("reports points where the expression isn't defined", () => {
    expect(error("nDeriv(sqrt(x), x, 0)")).toMatch(/isn't defined around 0/);
    expect(error("nDeriv(x^2, 3, 1)")).toMatch(/second argument must be a variable/);
    expect(error("nDeriv(x^2, x)")).toMatch(/takes 3 arguments/);
  });
});

describe("fnInt", () => {
  it("integrates between two bounds", () => {
    expect(value("fnInt(x^2, x, 0, 1)")).toBeCloseTo(1 / 3, 12);
    expect(value("fnInt(sin(x), x, 0, pi)")).toBeCloseTo(2, 12);
    expect(value("fnInt(1/x, x, 1, e)")).toBeCloseTo(1, 12);
  });

  it("reports integrals that can't be computed", () => {
    expect(error("fnInt(log(x), x, -1, 1)")).toMatch(/fnInt: no result/);
    expect(error("fnInt(x, x, 0, Infinity)")).toMatch(/bounds must be finite/);
  });
});

describe("solve", () => {
  it("finds a root near a guess or in a bracket", () => {
    expect(value("solve(x^3 - 2x - 5, x, 2)")).toBeCloseTo(2.0945514815423265, 12);
    expect(value("solve(x^2 - 2, x, 0, 5)")).toBeCloseTo(Math.SQRT2, 12);
    expect(value("solve(x^2 - 2, x, -1)")).toBeCloseTo(-Math.SQRT2, 12);
  });

  it("solves equations written with ==", () => {
    expect(value("solve(cos(x) == x, x, 1)")).toBeCloseTo(0.7390851332151607, 12);
  });

  it("reports when there is no root", () => {
    expect(error("solve(x^2 + 1, x, 0)")).toBe("solve: no root found near 0");
    expect(error("solve(x^2 - 2, x, 2, 5)")).toMatch(/no root found between 2 and 5/);
  });
});

describe("calculus in graphs", () => {
  it("graphs a derivative and a running integral of x", () => {
    const slope = compileFunction("y = nDeriv(t^3, t, x)", createScope());
    expect(slope.ok && slope.fn(2)).toBeCloseTo(12, 8);

    const area = compileFunction("y = fnInt(t, t, 0, x)", createScope());
    expect(area.ok && area.fn(4)).toBeCloseTo(8, 10);
  });

  it("still reports genuinely unknown symbols", () => {
    const result = compileFunction("y = fnInt(t * k, t, 0, x)", createScope());
    expect(result.ok ? "" : result.error).toBe("Undefined symbol: k");
  });

  it("returns NaN where a calculus function fails", () => {
    const result = compileFunction("y = nDeriv(sqrt(t), t, x)", createScope());
    expect(result.ok && result.fn(-1)).toBeNaN();
  });
});
