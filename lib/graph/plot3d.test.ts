import { describe, expect, it } from "vitest";
import { createScope, evaluateExpression } from "@/lib/math/engine";
import { registerPrograms } from "@/lib/script/interpreter";
import { traceImplicit, segmentsPath } from "./implicit";
import { computeJob } from "./plotJobs";
import { compilePlot, splitEquation } from "./plotSpec";
import { needsMissing, restoreScope, snapshotScope } from "./scopeSnapshot";
import { sampleSurface, zRange } from "./surface";

describe("equation classification", () => {
  it("splits at a single top-level =", () => {
    expect(splitEquation("x^2 + y^2 = 4")).toEqual(["x^2 + y^2", "4"]);
    expect(splitEquation("y >= x")).toBeNull();
    expect(splitEquation("x == 1")).toBeNull();
    expect(splitEquation("a = b = c")).toBeNull();
    expect(splitEquation("f(x = 1)")).toBeNull();
  });

  it("recognizes surfaces, implicit curves and functions", () => {
    const scope = createScope();
    const kind = (text: string) => {
      const r = compilePlot(text, scope, "rad");
      return r.ok ? r.spec.kind : r.error;
    };
    expect(kind("z = sin(x) cos(y)")).toBe("surface");
    expect(kind("x^2 + y^2 = 4")).toBe("implicit");
    expect(kind("x = 3")).toBe("implicit");
    expect(kind("sin(x) = y")).toBe("implicit");
    expect(kind("y = x^2")).toBe("function");
    expect(kind("y = x + y / 2")).toBe("implicit");
    expect(kind("y > x")).toBe("inequality");
    expect(kind("r = 2")).toBe("polar");
    expect(kind("z = x + q")).toBe("Undefined symbol: q");
    expect(kind("g(x) = x^2")).toBe("Define g in the Expression input, then graph it here as g(x)");
    expect(kind("x^2 = ")).toBe("Write an expression on both sides of =");
  });

  it("keeps the source of implicit curves as F = left - right", () => {
    const r = compilePlot("x^2 + y^2 = 4", createScope(), "rad");
    expect(r.ok && r.spec.kind === "implicit" && r.spec.source).toBe("(x^2 + y^2) - (4)");
    expect(r.ok && r.spec.tex).toContain("=");
  });
});

describe("surface sampling", () => {
  it("samples a grid row by row", () => {
    const z = sampleSurface((x, y) => x + 10 * y, { xMin: 0, xMax: 2, yMin: 0, yMax: 1 }, 2);
    expect([...z]).toEqual([0, 1, 2, 5, 6, 7, 10, 11, 12]);
  });

  it("marks undefined points as NaN", () => {
    const z = sampleSurface((x) => Math.sqrt(x), { xMin: -1, xMax: 1, yMin: 0, yMax: 1 }, 2);
    expect(Number.isNaN(z[0])).toBe(true);
    expect(z[2]).toBe(1);
  });

  it("picks a z-range that ignores spikes", () => {
    expect(zRange([Float64Array.from([1, 2, 3])])).toEqual({ min: 1, max: 3 });
    expect(zRange([Float64Array.from([5, 5])])).toEqual({ min: 4, max: 6 });
    expect(zRange([Float64Array.from([NaN])])).toBeNull();
    const spiky = Float64Array.from([...Array.from({ length: 200 }, (_, i) => i / 200), 1e6]);
    expect(zRange([spiky])!.max).toBeLessThan(2);
  });
});

describe("implicit curves", () => {
  it("traces a circle with points on the curve", () => {
    const segments = traceImplicit((x, y) => x * x + y * y - 4, -3, 3, -3, 3, 60, 60);
    expect(segments.length).toBeGreaterThan(100);
    for (let k = 0; k < segments.length; k += 2) {
      expect(Math.hypot(segments[k], segments[k + 1])).toBeCloseTo(2, 2);
    }
  });

  it("draws vertical lines such as x = 3", () => {
    const segments = traceImplicit((x) => x - 3, -5, 5, -5, 5, 40, 40);
    expect(segments.length).toBeGreaterThan(0);
    for (let k = 0; k < segments.length; k += 2) expect(segments[k]).toBeCloseTo(3, 9);
  });

  it("does not join across a pole", () => {
    // y = 1/x has no points near x = 0, though F = 1/x - y changes sign there.
    const segments = traceImplicit((x, y) => 1 / x - y, -2, 2, -2, 2, 41, 41);
    for (let k = 0; k < segments.length; k += 2) expect(Math.abs(segments[k])).toBeGreaterThan(0.4);
  });

  it("formats SVG path data", () => {
    expect(segmentsPath(Float64Array.from([0, 1, 2, 3]))).toBe("M0 1L2 3");
  });
});

describe("plotting worker data", () => {
  it("copies variables, functions, matrices and programs into a working scope", () => {
    const scope = createScope();
    evaluateExpression("a = 2", scope);
    evaluateExpression("f(t) = a t^2", scope, "deg");
    evaluateExpression("h(t) = sin(t)", scope, "deg");
    evaluateExpression("M = [[1, 2], [3, 4]]", scope);
    evaluateExpression("u = 5 cm", scope);
    registerPrograms(scope, [{ id: "p", name: "double", params: ["v"], body: "return 2 v" }], "rad");

    const snapshot = snapshotScope(scope);
    expect(snapshot.missing).toEqual(["ans", "u"]); // ans is the unit 5 cm
    const copy = structuredClone(snapshot);
    const restored = restoreScope(copy, "rad");
    const result = evaluateExpression("f(3) + det(M) + double(1) + a", restored);
    expect(result).toMatchObject({ ok: true, display: "20" }); // 18 - 2 + 2 + 2
    expect(evaluateExpression("f(1)", restored)).toMatchObject({ display: "2" });
    // Functions keep the angle mode they were defined in.
    expect(evaluateExpression("h(90)", restored)).toMatchObject({ display: "1" });
  });

  it("flags jobs that need values the worker can't get", () => {
    const scope = createScope();
    evaluateExpression("u = 5 cm", scope);
    evaluateExpression("g(t) = t + u", scope);
    const snapshot = snapshotScope(scope);
    expect(needsMissing("x + u", snapshot)).toBe(true);
    expect(needsMissing("x + 1", snapshot)).toBe(true); // g mentions u
    expect(needsMissing("x + 1", snapshotScope(createScope()))).toBe(false);
  });

  it("computes surface and implicit jobs from a snapshot", () => {
    const scope = createScope();
    evaluateExpression("k = 3", scope);
    const snapshot = structuredClone(snapshotScope(scope));
    const surface = computeJob({
      kind: "surface",
      items: [{ id: "a", source: "k x y" }, { id: "b", source: "q" }],
      domain: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
      n: 1,
      angleMode: "rad",
      scope: snapshot,
    });
    expect(surface.kind === "surface" && surface.grids).toEqual([
      { id: "a", z: Float64Array.from([0, 0, 0, 3]) },
      { id: "b", error: "Undefined symbol: q" },
    ]);
    const implicit = computeJob({
      kind: "implicit",
      source: "(x) - (k)",
      xMin: 0,
      xMax: 5,
      yMin: 0,
      yMax: 5,
      cols: 10,
      rows: 10,
      angleMode: "rad",
      scope: snapshot,
    });
    expect(implicit.kind === "implicit" && implicit.segments.length).toBeGreaterThan(0);
  });
});
