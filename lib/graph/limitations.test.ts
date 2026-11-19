import { describe, expect, it } from "vitest";
import { createScope, evaluateExpression } from "@/lib/math/engine";
import { traceImplicit } from "./implicit";
import { findKeyPoints, findZeros } from "./keyPoints";
import { computeJob } from "./plotJobs";
import { compilePlot } from "./plotSpec";
import { snapshotScope } from "./scopeSnapshot";
import { hitTest, type Quad } from "./surface";

describe("touching roots", () => {
  it("finds roots where a curve touches zero without crossing", () => {
    const zeros = findZeros((x) => (x - 1) ** 2, -5, 5, 600, 1e-5);
    expect(zeros).toHaveLength(1);
    expect(zeros[0]).toBeCloseTo(1, 6);
    expect(findZeros((x) => -((x + 2) ** 2), -5, 5, 600, 1e-5)[0]).toBeCloseTo(-2, 6);
    expect(findZeros((x) => Math.abs(x - 0.3), -5, 5, 600, 1e-5)[0]).toBeCloseTo(0.3, 6);
  });

  it("ignores minima that stay away from zero", () => {
    expect(findZeros((x) => x * x + 0.5, -5, 5, 600, 1e-5)).toEqual([]);
    expect(findZeros((x) => Math.cos(x) + 2, -5, 5, 600, 1e-5)).toEqual([]);
  });

  it("still finds ordinary roots once each, and skips poles", () => {
    const zeros = findZeros((x) => x * x - 4, -5, 5, 600, 1e-5);
    expect(zeros.map((z) => Number(z.toFixed(6)))).toEqual([-2, 2]);
    expect(findZeros((x) => 1 / x, -5, 5, 601, 1e-5)).toEqual([]);
  });

  it("marks tangent intersections", () => {
    const points = findKeyPoints(
      [
        { id: "a", fn: (x) => x * x },
        { id: "b", fn: (x) => 2 * x - 1 },
      ],
      -5,
      5,
      -6,
      6,
    );
    const tangent = points.find((p) => p.kind === "intersection");
    expect(tangent?.x).toBeCloseTo(1, 6);
    expect(tangent?.y).toBeCloseTo(1, 6);
    expect(points.find((p) => p.kind === "root" && p.curveIds[0] === "a")?.x).toBeCloseTo(0, 6);
  });
});

describe("touching implicit curves", () => {
  it("traces a squared circle (x^2 + y^2 - 4)^2 = 0", () => {
    const segments = traceImplicit((x, y) => (x * x + y * y - 4) ** 2, -3, 3, -3, 3, 60, 60);
    expect(segments.length).toBeGreaterThan(100);
    for (let k = 0; k < segments.length; k += 2) expect(Math.hypot(segments[k], segments[k + 1])).toBeCloseTo(2, 3);
  });

  it("traces a squared line (x - y)^2 = 0", () => {
    const segments = traceImplicit((x, y) => (x - y) ** 2, -3, 3, -3, 3, 40, 40);
    expect(segments.length).toBeGreaterThan(40);
    for (let k = 0; k < segments.length; k += 2) expect(segments[k]).toBeCloseTo(segments[k + 1], 6);
  });

  it("draws nothing for a minimum above zero", () => {
    expect(traceImplicit((x, y) => (x * x + y * y - 4) ** 2 + 0.01, -3, 3, -3, 3, 60, 60)).toHaveLength(0);
  });

  it("leaves sign-changing curves as before", () => {
    const segments = traceImplicit((x, y) => x * x + y * y - 4, -3, 3, -3, 3, 60, 60);
    for (let k = 0; k < segments.length; k += 2) expect(Math.hypot(segments[k], segments[k + 1])).toBeCloseTo(2, 2);
  });
});

describe("2D curves in the worker", () => {
  it("keeps the source of function rows", () => {
    const r = compilePlot("y = 2x + 1", createScope(), "rad");
    expect(r.ok && r.spec.kind === "function" && r.spec.source).toBe("2x + 1");
    const bare = compilePlot("x^2", createScope(), "rad");
    expect(bare.ok && bare.spec.kind === "function" && bare.spec.source).toBe("x^2");
  });

  it("samples curve paths from a scope snapshot", () => {
    const scope = createScope();
    evaluateExpression("a = 2", scope);
    const result = computeJob({
      kind: "curve",
      source: "a x",
      samples: 4,
      xMin: 0,
      xMax: 4,
      yMin: -10,
      yMax: 10,
      angleMode: "rad",
      scope: structuredClone(snapshotScope(scope)),
    });
    expect(result).toEqual({ kind: "curve", path: "M0 0 L1 2 L2 4 L3 6 L4 8" });
  });

  it("finds key points, skipping curves that don't compile", () => {
    const result = computeJob({
      kind: "keyPoints",
      curves: [
        { id: "a", source: "x^2 - 1" },
        { id: "b", source: "q x" },
      ],
      xMin: -5,
      xMax: 5,
      yMin: -6,
      yMax: 6,
      angleMode: "rad",
      scope: snapshotScope(createScope()),
    });
    // Roots at ±1 and the minimum at (0, -1).
    expect(result.kind === "keyPoints" && result.points.map((p) => [p.kind, Number(p.x.toFixed(6))])).toEqual([
      ["root", -1],
      ["root", 1],
      ["min", 0],
    ]);
  });
});

describe("3D readout", () => {
  const quad = (i: number, j: number, depth: number, points: number[]): Quad => ({
    depth,
    points,
    fill: "",
    stroke: "",
    surfaceId: "s",
    i,
    j,
  });

  it("maps a screen point inside a cell to its grid position", () => {
    // Cell (2, 3) drawn as an axis-aligned square from (0, 0) to (10, 10).
    const hit = hitTest([quad(2, 3, 0, [0, 0, 10, 0, 10, 10, 0, 10])], 2.5, 7.5);
    expect(hit?.gi).toBeCloseTo(2.25, 9);
    expect(hit?.gj).toBeCloseTo(3.75, 9);
    expect(hitTest([quad(2, 3, 0, [0, 0, 10, 0, 10, 10, 0, 10])], 12, 5)).toBeNull();
  });

  it("prefers the nearest cell, drawn last", () => {
    const far = quad(0, 0, 5, [0, 0, 10, 0, 10, 10, 0, 10]);
    const near = quad(7, 7, 1, [0, 0, 10, 0, 10, 10, 0, 10]);
    expect(hitTest([far, near], 5, 5)?.quad).toBe(near);
  });
});
