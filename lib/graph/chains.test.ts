import { describe, expect, it } from "vitest";
import { createScope } from "@/lib/math/engine";
import { computeJob } from "./plotJobs";
import { compilePlot, splitComparison, splitComparisons } from "./plotSpec";
import { regionBoundaries, shadeRegion, type Condition } from "./region";
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

describe("chained comparisons", () => {
  it("splits a chain into parts and comparisons", () => {
    expect(splitComparisons("1 < x <= 2")).toEqual({ parts: ["1", "x", "2"], ops: ["<", "<="] });
    expect(splitComparisons("-2 ≤ y ≤ 3")).toEqual({ parts: ["-2", "y", "3"], ops: ["<=", "<="] });
    expect(splitComparisons("0 < f(x < 1) < 2")).toEqual({ parts: ["0", "f(x < 1)", "2"], ops: ["<", "<"] });
    expect(splitComparisons("x + 1")).toBeNull();
    // The single-comparison form still rejects chains.
    expect(splitComparison("1 < x < 2")).toBeNull();
  });

  it("makes one condition per comparison", () => {
    const r = compilePlot("1 < x <= 2", createScope(), "rad");
    expect(r.ok && r.spec.kind === "region" && r.spec.conditions).toEqual([
      { source: "(1) - (x)", op: "<" },
      { source: "(x) - (2)", op: "<=" },
    ]);
    expect(r.ok && r.spec.tex).toBe("1 < x \\le 2");
  });

  it("classifies chains, including ones with y, as regions", () => {
    const kind = (text: string) => {
      const r = compilePlot(text, createScope(), "rad");
      return r.ok ? `${r.spec.kind}${r.spec.kind === "region" ? r.spec.conditions.length : ""}` : r.error;
    };
    expect(kind("1 < x < 2")).toBe("region2");
    expect(kind("x^2 <= y <= 4")).toBe("region2");
    expect(kind("1 < x^2 + y^2 < 4")).toBe("region2");
    expect(kind("-1 < x < y < 1")).toBe("region3");
    expect(kind("y > x^2")).toBe("inequality");
    expect(kind("1 < x <")).toBe("Write an expression on both sides of <");
    expect(kind("1 < q < 2")).toBe("Undefined symbol: q");
  });
});

describe("shading chains", () => {
  const strip: Condition[] = [
    { F: (x) => 1 - x, op: "<" },
    { F: (x) => x - 2, op: "<" },
  ];

  it("shades a vertical strip 1 < x < 2", () => {
    expect(pathArea(shadeRegion(strip, 0, 4, 0, 2, 8, 4))).toBeCloseTo(2, 9);
    // Grid lines that don't fall on the edges.
    expect(pathArea(shadeRegion(strip, -3.3, 4.1, 0, 2, 37, 4))).toBeCloseTo(2, 9);
  });

  it("shades a ring 1 < x^2 + y^2 < 4", () => {
    const ring: Condition[] = [
      { F: (x, y) => 1 - (x * x + y * y), op: "<" },
      { F: (x, y) => x * x + y * y - 4, op: "<" },
    ];
    const area = pathArea(shadeRegion(ring, -3, 3, -3, 3, 150, 150));
    expect(area).toBeGreaterThan(3 * Math.PI * 0.99);
    expect(area).toBeLessThan(3 * Math.PI * 1.01);
  });

  it("shades between a curve and a line, x^2 <= y <= 4", () => {
    const between: Condition[] = [
      { F: (x, y) => x * x - y, op: "<=" },
      { F: (x, y) => y - 4, op: "<=" },
    ];
    const area = pathArea(shadeRegion(between, -3, 3, -1, 5, 150, 150));
    expect(area).toBeGreaterThan((32 / 3) * 0.99);
    expect(area).toBeLessThan((32 / 3) * 1.01);
  });

  it("draws each edge only where it borders the region", () => {
    const between: Condition[] = [
      { F: (x, y) => x * x - y, op: "<=" },
      { F: (x, y) => y - 4, op: "<=" },
    ];
    const [parabola, top] = regionBoundaries(between, -3, 3, -1, 5, 120, 120);
    const points = (lines: number[][]) => lines.flatMap((line) => line.filter((_, k) => k % 2 === 0).map((x, k) => [x, line[2 * k + 1]]));
    // The parabola stops at y = 4 (x = ±2); the line y = 4 runs only between them.
    for (const [x, y] of points(parabola)) {
      expect(y).toBeLessThanOrEqual(4 + 1e-9);
      expect(Math.abs(x)).toBeLessThanOrEqual(2 + 1e-9);
    }
    for (const [x, y] of points(top)) {
      expect(y).toBeCloseTo(4, 9);
      expect(Math.abs(x)).toBeLessThanOrEqual(2 + 1e-9);
    }
    // The line y = 4 reaches the parabola exactly at x = ±2.
    const topXs = points(top).map(([x]) => x);
    expect(Math.min(...topXs)).toBeCloseTo(-2, 9);
    expect(Math.max(...topXs)).toBeCloseTo(2, 9);
    expect(parabola).toHaveLength(1);
    expect(top).toHaveLength(1);
  });

  it("runs as a worker job with a boundary per condition", () => {
    const result = computeJob({
      kind: "region",
      conditions: [
        { source: "(1) - (x)", op: "<" },
        { source: "(x) - (2)", op: "<=" },
      ],
      xMin: 0,
      xMax: 4,
      yMin: 0,
      yMax: 2,
      cols: 8,
      rows: 4,
      angleMode: "rad",
      scope: snapshotScope(createScope()),
    });
    expect(result.kind === "region" && pathArea(result.fill)).toBeCloseTo(2, 9);
    expect(result.kind === "region" && result.boundaries.map((b) => [b.path.match(/M/g)?.length, b.strict])).toEqual([
      [1, true],
      [1, false],
    ]);
  });
});
