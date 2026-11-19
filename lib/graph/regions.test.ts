import { describe, expect, it } from "vitest";
import { createScope, evaluateExpression, rebindFunctions } from "@/lib/math/engine";
import { joinSegments, segmentsPath, traceImplicit } from "./implicit";
import { computeJob } from "./plotJobs";
import { compilePlot, splitComparison } from "./plotSpec";
import { shadeRegion } from "./region";
import { snapshotScope } from "./scopeSnapshot";

/** Total area of an SVG path made of closed polygons (M…L…Z and M…H…V…H…Z). */
function pathArea(d: string): number {
  let area = 0;
  for (const part of d.split("Z").filter((p) => p.trim())) {
    const points: [number, number][] = [];
    for (const [, cmd, args] of part.matchAll(/([MLHV])([^MLHV]+)/g)) {
      const nums = args.trim().split(/\s+/).map(Number);
      const last = points[points.length - 1];
      if (cmd === "M" || cmd === "L") points.push([nums[0], nums[1]]);
      else if (cmd === "H") points.push([nums[0], last[1]]);
      else points.push([last[0], nums[0]]);
    }
    let sum = 0;
    for (let k = 0; k < points.length; k++) {
      const [x1, y1] = points[k];
      const [x2, y2] = points[(k + 1) % points.length];
      sum += x1 * y2 - x2 * y1;
    }
    area += Math.abs(sum) / 2;
  }
  return area;
}

describe("inequality classification", () => {
  it("splits at a single top-level comparison", () => {
    expect(splitComparison("x > 2")).toEqual({ lhs: "x", op: ">", rhs: "2" });
    expect(splitComparison("x^2 + y^2 <= 4")).toEqual({ lhs: "x^2 + y^2", op: "<=", rhs: "4" });
    expect(splitComparison("x ≥ y")).toEqual({ lhs: "x", op: ">=", rhs: "y" });
    expect(splitComparison("1 < x < 2")).toBeNull();
    expect(splitComparison("f(x < 1)")).toBeNull();
    expect(splitComparison("x == 1")).toBeNull();
  });

  it("shades y > f(x) from the curve and everything else from a grid", () => {
    const scope = createScope();
    const kind = (text: string) => {
      const r = compilePlot(text, scope, "rad");
      return r.ok ? r.spec.kind : r.error;
    };
    expect(kind("y > x^2")).toBe("inequality");
    expect(kind("x^2 <= y")).toBe("inequality");
    expect(kind("x > 2")).toBe("region");
    expect(kind("x^2 + y^2 < 4")).toBe("region");
    expect(kind("y > x + y/2")).toBe("region");
    expect(kind("x y >= 1")).toBe("region");
    expect(kind("x > ")).toBe("Write an expression on both sides of >");
    expect(kind("x > q")).toBe("Undefined symbol: q");
  });

  it("keeps F and the comparison for the worker", () => {
    const r = compilePlot("x^2 + y^2 < 4", createScope(), "rad");
    expect(r.ok && r.spec.kind === "region" && r.spec.conditions).toEqual([{ source: "(x^2 + y^2) - (4)", op: "<" }]);
    expect(r.ok && r.spec.tex).toContain("<");
  });
});

describe("region shading", () => {
  it("covers a half-plane exactly", () => {
    expect(pathArea(shadeRegion([{ F: (x) => x - 2, op: ">" }], 0, 4, 0, 2, 8, 4))).toBeCloseTo(4, 9);
    expect(pathArea(shadeRegion([{ F: (x) => x - 2.3, op: "<=" }], 0, 4, 0, 2, 8, 4))).toBeCloseTo(4.6, 9);
  });

  it("covers a disc to within the grid resolution", () => {
    const area = pathArea(shadeRegion([{ F: (x, y) => x * x + y * y - 4, op: "<" }], -3, 3, -3, 3, 120, 120));
    expect(area).toBeGreaterThan(4 * Math.PI * 0.99);
    expect(area).toBeLessThan(4 * Math.PI * 1.01);
  });

  it("covers nothing or everything when the inequality never or always holds", () => {
    expect(shadeRegion([{ F: (x, y) => x * x + y * y + 1, op: "<" }], -1, 1, -1, 1, 10, 10)).toBe("");
    expect(pathArea(shadeRegion([{ F: (x, y) => x * x + y * y + 1, op: ">" }], -1, 1, -1, 1, 10, 10))).toBeCloseTo(4, 9);
  });

  it("leaves out undefined points", () => {
    // sqrt(x) > 1 holds only for x > 1; x < 0 is undefined.
    expect(pathArea(shadeRegion([{ F: (x) => Math.sqrt(x) - 1, op: ">" }], -2, 2, 0, 1, 40, 2))).toBeCloseTo(1, 1);
  });

  it("runs as a worker job with a boundary", () => {
    const result = computeJob({
      kind: "region",
      conditions: [{ source: "(x) - (2)", op: ">" }],
      xMin: 0,
      xMax: 4,
      yMin: 0,
      yMax: 2,
      cols: 8,
      rows: 4,
      angleMode: "rad",
      scope: snapshotScope(createScope()),
    });
    expect(result.kind === "region" && pathArea(result.fill)).toBeCloseTo(4, 9);
    // The boundary x = 2 comes back as one joined line.
    expect(result.kind === "region" && result.boundaries.map((b) => [b.path.match(/M/g)?.length, b.strict])).toEqual([[1, true]]);
  });
});

describe("joining boundary segments", () => {
  it("joins segments that share endpoints into polylines", () => {
    const segments = Float64Array.from([1, 1, 2, 0, 0, 0, 1, 1, 5, 5, 6, 6]);
    const lines = joinSegments(segments);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual([0, 0, 1, 1, 2, 0]);
    expect(segmentsPath(segments)).toBe("M0 0L1 1L2 0M5 5L6 6");
  });

  it("joins a whole boundary even when grid steps aren't exact in binary", () => {
    // Pane ranges like these give steps such as 0.1157…; cells must still meet exactly.
    expect(joinSegments(traceImplicit((x) => x - 2, -16.1, 16.3, -9.7, 9.3, 280, 200))).toHaveLength(1);
    expect(joinSegments(traceImplicit((x, y) => x * x + y * y - 4, -16.1, 16.3, -9.7, 9.3, 280, 200))).toHaveLength(1);
  });
});

describe("functions follow the angle mode", () => {
  it("redefines user functions in the new mode", () => {
    const scope = createScope();
    evaluateExpression("f(t) = sin(t)", scope, "deg");
    evaluateExpression("g(t) = 2t", scope, "deg");
    expect(evaluateExpression("f(90)", scope, "deg")).toMatchObject({ display: "1" });
    expect(rebindFunctions(scope, "rad").sort()).toEqual(["f", "g"]);
    expect(evaluateExpression("f(pi / 2)", scope, "rad")).toMatchObject({ display: "1" });
    expect(rebindFunctions(scope, "rad")).toEqual([]);
    expect(rebindFunctions(scope, "grad")).toHaveLength(2);
    expect(evaluateExpression("f(100)", scope, "grad")).toMatchObject({ display: "1" });
  });

  it("leaves ans and other values alone", () => {
    const scope = createScope();
    evaluateExpression("a = sin(30)", scope, "deg");
    evaluateExpression("h(t) = a t", scope, "deg");
    const ans = scope.get("ans");
    rebindFunctions(scope, "rad");
    expect(scope.get("a")).toBeCloseTo(0.5, 12); // still sin(30°), not sin(30 rad)
    expect(scope.get("ans")).toBe(ans);
    expect(evaluateExpression("h(2)", scope, "rad")).toMatchObject({ display: "1" });
  });
});
