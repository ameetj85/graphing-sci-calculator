import { describe, expect, it } from "vitest";
import { findKeyPoints, findZeros, formatCoordinate, nearestDefinedX } from "./keyPoints";

describe("findZeros", () => {
  it("finds sign-change roots precisely", () => {
    const zeros = findZeros((x) => x * x - 2, -5, 5, 200, 1e-9);
    expect(zeros).toHaveLength(2);
    expect(zeros[0]).toBeCloseTo(-Math.SQRT2, 10);
    expect(zeros[1]).toBeCloseTo(Math.SQRT2, 10);
  });

  it("finds roots that land exactly on a sample", () => {
    expect(findZeros((x) => x, -5, 5, 10, 1e-9)).toEqual([0]);
  });

  it("ignores sign flips across asymptotes", () => {
    expect(findZeros((x) => 1 / x, -5, 5, 201, 1e-6)).toEqual([]);
    const tanZeros = findZeros(Math.tan, -4, 4, 400, 1e-6);
    expect(tanZeros).toHaveLength(3); // -π, 0, π
  });

  it("skips undefined regions", () => {
    expect(findZeros(() => NaN, -1, 1, 10, 1e-6)).toEqual([]);
  });
});

describe("findKeyPoints", () => {
  it("reports roots of each curve and intersections between curves", () => {
    const points = findKeyPoints(
      [
        { id: "a", fn: (x) => x },
        { id: "b", fn: (x) => x * x - 2 },
      ],
      -5,
      5,
      -5,
      5,
    );
    const roots = points.filter((p) => p.kind === "root");
    const intersections = points.filter((p) => p.kind === "intersection");
    expect(roots.map((p) => p.curveIds[0])).toEqual(["a", "b", "b"]);
    // x = x^2 - 2 at x = -1 and x = 2
    expect(intersections.map((p) => p.x.toFixed(6))).toEqual(["-1.000000", "2.000000"]);
    expect(intersections[1].y).toBeCloseTo(2, 8);
    expect(intersections[0].curveIds).toEqual(["a", "b"]);
  });

  it("reports maxima and minima, once when they are also roots", () => {
    const points = findKeyPoints(
      [
        { id: "cubic", fn: (x) => x ** 3 - 3 * x }, // max at (-1, 2), min at (1, -2)
        { id: "square", fn: (x) => (x - 1) ** 2 }, // min at (1, 0), also a root
      ],
      -3,
      3,
      -5,
      5,
    );
    const extrema = points.filter((p) => p.kind === "max" || p.kind === "min");
    expect(extrema.map((p) => [p.kind, p.curveIds[0], Number(p.x.toFixed(6)), Number(p.y.toFixed(6))])).toEqual([
      ["max", "cubic", -1, 2],
      ["min", "cubic", 1, -2],
    ]);
    expect(points.filter((p) => p.curveIds[0] === "square" && p.curveIds.length === 1).map((p) => p.kind)).toEqual(["root"]);
  });
});

describe("nearestDefinedX", () => {
  it("returns the start when defined, else searches outward", () => {
    expect(nearestDefinedX(Math.sqrt, 4, 0.1)).toBe(4);
    expect(nearestDefinedX((x) => Math.log(x - 2), 0, 0.5)).toBe(2.5);
    expect(nearestDefinedX(() => NaN, 0, 1, 10)).toBeNull();
  });
});

describe("formatCoordinate", () => {
  it("rounds away floating-point noise", () => {
    expect(formatCoordinate(1.9999999999)).toBe("2");
    expect(formatCoordinate(1e-12)).toBe("0");
    expect(formatCoordinate(-1.41421356)).toBe("-1.41421");
  });
});
