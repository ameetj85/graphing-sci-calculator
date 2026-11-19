import { describe, expect, it } from "vitest";
import { fieldPaths, type FieldOptions } from "./field";

const view: FieldOptions = { xMin: -5, xMax: 5, yMin: -5, yMax: 5, xScale: 40, yScale: 40, slope: false };

/** Segment endpoints of the first sub-path of every "M…L…" command. */
function segments(d: string): number[][] {
  return [...d.matchAll(/M(-?[\d.e-]+) (-?[\d.e-]+)L(-?[\d.e-]+) (-?[\d.e-]+)/g)].map((m) => m.slice(1, 5).map(Number));
}

describe("fieldPaths", () => {
  it("draws one arrow per grid point, between grid lines", () => {
    // 40 px per unit and 34 px spacing gives a step of 1: points at ±0.5, ±1.5, ... ±4.5.
    const paths = fieldPaths(() => [1, 0], view);
    expect(paths).toHaveLength(1);
    const segs = segments(paths[0].d).filter((_, i) => i % 2 === 0); // shafts, not heads
    expect(segs).toHaveLength(100);
    const [x1, y1, x2, y2] = segs[0];
    expect((x1 + x2) / 2).toBeCloseTo(-4.5, 6);
    expect(y1).toBeCloseTo(y2, 6); // horizontal
    expect(x2 - x1).toBeCloseTo(0.75, 6); // 75% of the 1-unit gap
  });

  it("keeps directions right on unequal axis scales", () => {
    // y = x direction; with y drawn 4x larger, the on-screen angle is steeper than 45°.
    const [shaft] = segments(fieldPaths(() => [1, 1], { ...view, xScale: 10, yScale: 40, slope: true })[0].d);
    const [x1, y1, x2, y2] = shaft;
    expect((y2 - y1) / (x2 - x1)).toBeCloseTo(1, 6); // still slope 1 in graph units
  });

  it("shades arrows by length and skips undefined and zero vectors", () => {
    const paths = fieldPaths((x, y) => (x < 0 ? [NaN, 0] : x < 1 ? [0, 0] : [x, y]), view);
    expect(paths.length).toBeGreaterThan(1);
    expect(paths.at(-1)!.opacity).toBe(1);
    const all = paths.flatMap((p) => segments(p.d));
    expect(all.every(([x1, , x2]) => (x1 + x2) / 2 > 0.5)).toBe(true);
  });

  it("draws slope fields as plain segments, vertical for infinite slopes", () => {
    const [path] = fieldPaths((x) => [1, x === 0.5 ? Infinity : 0], { ...view, slope: true });
    const segs = segments(path.d);
    expect(segs).toHaveLength(100); // no arrow heads
    expect(segs.some(([x1, , x2]) => x1 === x2)).toBe(true);
  });

  it("returns nothing for an empty view", () => {
    expect(fieldPaths(() => [1, 1], { ...view, xMax: -5 })).toEqual([]);
  });
});
