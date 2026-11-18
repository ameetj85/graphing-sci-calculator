import { describe, expect, it } from "vitest";
import { inequalityFillPath, sampleFunction, sampleParametric, segmentsToPath, type Point } from "./sample";

const view = { samples: 400, yMin: -10, yMax: 10 };

describe("sampleFunction", () => {
  it("draws a continuous function as one segment", () => {
    const segments = sampleFunction((x) => x * x, -5, 5, view);
    expect(segments).toHaveLength(1);
    expect(segments[0][0]).toEqual([-5, 25]);
    expect(segments[0].at(-1)).toEqual([5, 25]);
  });

  it("keeps steep but continuous functions in one segment", () => {
    expect(sampleFunction((x) => 1000 * x, -5, 5, view)).toHaveLength(1);
    expect(sampleFunction((x) => x ** 9, -5, 5, view)).toHaveLength(1);
  });

  it("splits at vertical asymptotes", () => {
    expect(sampleFunction((x) => 1 / x, -5, 5, view)).toHaveLength(2);
    // tan has asymptotes at ±π/2 and ±3π/2 within [-5, 5].
    expect(sampleFunction(Math.tan, -5, 5, view)).toHaveLength(5);
  });

  it("splits at jump discontinuities that are visible at the current scale", () => {
    expect(sampleFunction(Math.floor, -2.5, 2.5, { ...view, yMin: -5, yMax: 5 })).toHaveLength(6);
    // Jumps under 5% of the visible height are drawn connected.
    expect(sampleFunction(Math.floor, -2.5, 2.5, { ...view, yMin: -100, yMax: 100 })).toHaveLength(1);
  });

  it("skips undefined regions and extends curves to the domain edge", () => {
    const segments = sampleFunction((x) => Math.sqrt(x * x - 1), -5, 5, view);
    expect(segments).toHaveLength(2);
    expect(segments[0].at(-1)![0]).toBeCloseTo(-1, 6);
    expect(segments[1][0][0]).toBeCloseTo(1, 6);
  });

  it("returns nothing for a function that is undefined everywhere", () => {
    expect(sampleFunction(() => NaN, -5, 5, view)).toEqual([]);
  });
});

describe("sampleParametric", () => {
  it("draws a closed circle as one segment", () => {
    const segments = sampleParametric((t) => [Math.cos(t), Math.sin(t)], 0, 2 * Math.PI, 400, 20);
    expect(segments).toHaveLength(1);
    expect(segments[0][0][0]).toBeCloseTo(1);
    expect(segments[0].at(-1)![0]).toBeCloseTo(1);
  });

  it("splits where the curve jumps or is undefined", () => {
    // (t, 1/t) jumps at t = 0; (t, sqrt(t)) is undefined for t < 0.
    expect(sampleParametric((t) => [t, 1 / t], -5, 5, 400, 20)).toHaveLength(2);
    const half = sampleParametric((t) => [t, Math.sqrt(t)], -5, 5, 400, 20);
    expect(half).toHaveLength(1);
    expect(half[0][0][0]).toBeCloseTo(0, 6);
  });

  it("keeps fast but continuous motion in one segment", () => {
    expect(sampleParametric((t) => [100 * Math.cos(t), 100 * Math.sin(t)], 0, 2 * Math.PI, 50, 20)).toHaveLength(1);
  });
});

describe("inequalityFillPath", () => {
  it("closes each boundary segment against the far edge", () => {
    const segment: Point[] = [
      [0, 0],
      [1, 1],
    ];
    expect(inequalityFillPath([segment], true, -1, 1)).toBe("M0 0 L1 1 L1 3 L0 3 Z");
    expect(inequalityFillPath([segment], false, -1, 1)).toBe("M0 0 L1 1 L1 -3 L0 -3 Z");
  });
});

describe("segmentsToPath", () => {
  it("builds move/line commands and clamps extreme values", () => {
    expect(
      segmentsToPath(
        [
          [
            [0, 0],
            [1, 1e300],
          ],
        ],
        -1,
        1,
      ),
    ).toBe("M0 0 L1 21");
  });
});
