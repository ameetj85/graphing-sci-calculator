/**
 * Shaded regions F(x, y) op 0 for inequalities that aren't y > f(x), such as
 * x > 2 or x^2 + y^2 < 4. F is sampled on a grid; cells entirely inside are
 * merged into runs along each row, and cells on the boundary get the part
 * of the cell that is inside, cut along the linearly interpolated boundary.
 */
import type { Comparison } from "./plotSpec";

const holds = (value: number, op: Comparison): boolean =>
  op === "<" ? value < 0 : op === "<=" ? value <= 0 : op === ">" ? value > 0 : value >= 0;

/** SVG path data (in graph coordinates) covering where F op 0 holds. */
export function shadeRegion(
  F: (x: number, y: number) => number,
  op: Comparison,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  cols: number,
  rows: number,
): string {
  const dx = (xMax - xMin) / cols;
  const dy = (yMax - yMin) / rows;
  const stride = cols + 1;
  const values = new Float64Array(stride * (rows + 1));
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const v = F(xMin + i * dx, yMin + j * dy);
      values[j * stride + i] = Number.isFinite(v) ? v : NaN;
    }
  }
  const inside = (v: number) => !Number.isNaN(v) && holds(v, op);

  const parts: string[] = [];
  const rect = (x0: number, y0: number, x1: number, y1: number) => parts.push(`M${x0} ${y0}H${x1}V${y1}H${x0}Z`);

  for (let j = 0; j < rows; j++) {
    const y0 = yMin + j * dy;
    const y1 = yMin + (j + 1) * dy; // from the index, so rows share exact coordinates
    let runStart = -1;
    const endRun = (i: number) => {
      if (runStart >= 0) rect(xMin + runStart * dx, y0, xMin + i * dx, y1);
      runStart = -1;
    };
    for (let i = 0; i < cols; i++) {
      const corners = [
        values[j * stride + i],
        values[j * stride + i + 1],
        values[(j + 1) * stride + i + 1],
        values[(j + 1) * stride + i],
      ];
      const flags = corners.map(inside);
      if (flags.every(Boolean)) {
        if (runStart < 0) runStart = i;
        continue;
      }
      endRun(i);
      if (!flags.some(Boolean) || corners.some(Number.isNaN)) continue;

      // Boundary cell: walk the corners in order, adding inside corners and
      // the interpolated crossing on each edge whose ends differ.
      const x0 = xMin + i * dx;
      const x1 = xMin + (i + 1) * dx;
      const points: [number, number][] = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ];
      const polygon: [number, number][] = [];
      for (let k = 0; k < 4; k++) {
        const next = (k + 1) % 4;
        if (flags[k]) polygon.push(points[k]);
        if (flags[k] !== flags[next]) {
          const a = corners[k];
          const b = corners[next];
          const t = a === b ? 0.5 : Math.min(1, Math.max(0, a / (a - b)));
          polygon.push([
            points[k][0] + (points[next][0] - points[k][0]) * t,
            points[k][1] + (points[next][1] - points[k][1]) * t,
          ]);
        }
      }
      if (polygon.length >= 3) parts.push(`M${polygon.map(([x, y]) => `${x} ${y}`).join("L")}Z`);
    }
    endRun(cols);
  }
  return parts.join("");
}
