import { describe, expect, it } from "vitest";
import { rowIndexNear, tableRows, tableXs } from "./table";

describe("value table", () => {
  it("builds evenly spaced x values without floating-point noise", () => {
    expect(tableXs(0, 0.1, 4)).toEqual([0, 0.1, 0.2, 0.3]);
    expect(tableXs(-2, 1, 5)).toEqual([-2, -1, 0, 1, 2]);
  });

  it("evaluates every function at each x", () => {
    const rows = tableRows([(x) => x * x, (x) => Math.sqrt(x)], -1, 1, 3);
    expect(rows.map((r) => r.x)).toEqual([-1, 0, 1]);
    expect(rows[0].values[0]).toBe(1);
    expect(rows[0].values[1]).toBeNaN();
    expect(rows[2].values).toEqual([1, 1]);
  });

  it("finds the row nearest a traced x, within half a step", () => {
    const xs = tableXs(-5, 1, 11);
    expect(rowIndexNear(xs, 0.2, 1)).toBe(5);
    expect(rowIndexNear(xs, -4.6, 1)).toBe(0);
    expect(rowIndexNear(xs, 7, 1)).toBe(-1);
  });
});
