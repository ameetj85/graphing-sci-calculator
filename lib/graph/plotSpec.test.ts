import { describe, expect, it } from "vitest";
import { createScope } from "@/lib/math/engine";
import { compilePlot, splitTopLevel, type PlotSpec } from "./plotSpec";

function spec(text: string, angleMode: "rad" | "deg" = "rad"): PlotSpec {
  const result = compilePlot(text, createScope(), angleMode);
  if (!result.ok) throw new Error(`expected "${text}" to compile: ${result.error}`);
  return result.spec;
}

function error(text: string): string {
  const result = compilePlot(text, createScope(), "rad");
  if (result.ok) throw new Error(`expected "${text}" to fail`);
  return result.error;
}

describe("compilePlot", () => {
  it("treats plain expressions and y = … as functions", () => {
    const a = spec("x^2");
    const b = spec("y = x^2");
    expect(a.kind).toBe("function");
    expect(b.kind === "function" && b.fn(3)).toBe(9);
    // A parenthesized single expression is still a function.
    expect(spec("(x + 1)").kind).toBe("function");
    expect(spec("(x+1)*(x-1)").kind).toBe("function");
  });

  it("recognizes inequalities in either order", () => {
    const above = spec("y > x^2");
    expect(above.kind === "inequality" && above.op).toBe(">");
    const flipped = spec("x^2 <= y");
    expect(flipped.kind === "inequality" && flipped.op).toBe(">=");
    expect(spec("y ≤ sin(x)").kind === "inequality" && (spec("y ≤ sin(x)") as { op: string }).op).toBe("<=");
    expect(above.tex).toContain("y >");
  });

  it("compiles polar curves in theta, θ or t over a full turn", () => {
    const rose = spec("r = 2sin(3theta)");
    expect(rose.kind).toBe("polar");
    if (rose.kind !== "polar") return;
    expect(rose.tMax).toBeCloseTo(2 * Math.PI);
    const [x, y] = rose.xy(Math.PI / 6); // r = 2 at θ = π/6
    expect(Math.hypot(x, y)).toBeCloseTo(2);
    expect(rose.rangeLabel).toBe("θ from 0 to 2π");
    expect(spec("r = 1 + cos(θ)").kind).toBe("polar");
    expect(spec("r = t").kind).toBe("polar");
    expect(spec("r = 3").kind).toBe("polar");
  });

  it("uses degrees for polar angles in degree mode", () => {
    const circle = spec("r = 1", "deg");
    if (circle.kind !== "polar") throw new Error("expected polar");
    expect(circle.tMax).toBe(360);
    const [x, y] = circle.xy(90);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
  });

  it("compiles parametric curves with an optional range", () => {
    const circle = spec("(cos(t), sin(t))");
    expect(circle.kind).toBe("parametric");
    if (circle.kind !== "parametric") return;
    expect(circle.xy(0)).toEqual([1, 0]);
    const ranged = spec("(t, t^2) {-2 <= t <= 3}");
    if (ranged.kind !== "parametric") throw new Error("expected parametric");
    expect([ranged.tMin, ranged.tMax]).toEqual([-2, 3]);
    expect(ranged.rangeLabel).toBe("t from -2 to 3");
    const pi = spec("(cos(t), sin(t)) {0 <= t <= 4pi}");
    expect(pi.kind === "parametric" && pi.rangeLabel).toBe("t from 0 to 4π");
  });

  it("reports helpful errors", () => {
    expect(error("")).toBe("Enter an equation");
    expect(error("(t, t, t)")).toContain("two parts");
    expect(error("(t, k t)")).toContain("Undefined symbol: k");
    expect(error("x^2 {0 <= t <= 1}")).toContain("applies to polar");
    expect(error("(t, t) {3 <= t <= 1}")).toContain("first smaller");
    expect(error("y > k")).toContain("Undefined symbol: k");
  });
});

describe("splitTopLevel", () => {
  it("ignores commas inside nested calls", () => {
    expect(splitTopLevel("nthRoot(t, 3), max(t, 1)")).toEqual(["nthRoot(t, 3)", "max(t, 1)"]);
  });
});
