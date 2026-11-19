/**
 * Slope fields (dy/dx = f(x, y)) and vector fields (field(P, Q)) drawn as
 * short segments or arrows on a grid. Directions are worked out in pixels so
 * arrows keep their shape when the axes have different scales; the paths
 * are in graph coordinates, like every other curve.
 */
import { niceStep } from "./gridStep";

/** The vector at (x, y): [P, Q] for a vector field, [1, f] for a slope field. */
export type FieldFn = (x: number, y: number) => [number, number];

export type FieldOptions = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Pixels per unit along x and y (both positive). */
  xScale: number;
  yScale: number;
  /** Segments for a slope field, arrows for a vector field. */
  slope: boolean;
  /** Smallest gap between grid points, in pixels. */
  spacing?: number;
};

/** Path data per shade: longer vectors are drawn more opaque. */
export type FieldPaths = { d: string; opacity: number }[];

const SHADES = [0.3, 0.55, 0.8, 1];
const MAX_POINTS_PER_AXIS = 60;
const HEAD_ANGLE = (25 * Math.PI) / 180;

const fmt = (n: number) => Number(n.toPrecision(7));

export function fieldPaths(fn: FieldFn, options: FieldOptions): FieldPaths {
  const { xMin, xMax, yMin, yMax, xScale, yScale, slope, spacing = 34 } = options;
  if (!(xMax > xMin) || !(yMax > yMin) || !(xScale > 0) || !(yScale > 0)) return [];
  const xStep = niceStep(xScale, spacing);
  const yStep = niceStep(yScale, spacing);

  // Grid points sit between grid lines, so they don't cover the axes.
  const xs: number[] = [];
  for (let k = Math.ceil(xMin / xStep - 0.5); (k + 0.5) * xStep <= xMax && xs.length < MAX_POINTS_PER_AXIS; k++) xs.push((k + 0.5) * xStep);
  const ys: number[] = [];
  for (let k = Math.ceil(yMin / yStep - 0.5); (k + 0.5) * yStep <= yMax && ys.length < MAX_POINTS_PER_AXIS; k++) ys.push((k + 0.5) * yStep);

  const length = 0.75 * Math.min(xStep * xScale, yStep * yScale);
  const samples: { x: number; y: number; ux: number; uy: number; size: number }[] = [];
  let largest = 0;
  for (const x of xs) {
    for (const y of ys) {
      let [vx, vy] = fn(x, y);
      // An infinite slope is a vertical segment.
      if (slope && !Number.isFinite(vy) && !Number.isNaN(vy)) [vx, vy] = [0, 1];
      if (!Number.isFinite(vx) || !Number.isFinite(vy)) continue;
      // Direction on screen, in pixels (y up).
      const px = vx * xScale;
      const py = vy * yScale;
      const norm = Math.hypot(px, py);
      if (norm === 0) continue;
      const size = Math.hypot(vx, vy);
      largest = Math.max(largest, size);
      samples.push({ x, y, ux: px / norm, uy: py / norm, size });
    }
  }

  const commands: string[][] = SHADES.map(() => []);
  for (const { x, y, ux, uy, size } of samples) {
    const shade = slope || largest === 0 ? SHADES.length - 1 : Math.max(0, Math.ceil((size / largest) * SHADES.length) - 1);
    // Offsets in pixels converted back to graph units.
    const at = (alongPx: number, acrossPx: number): [number, number] => [
      x + (alongPx * ux - acrossPx * uy) / xScale,
      y + (alongPx * uy + acrossPx * ux) / yScale,
    ];
    const [x1, y1] = at(-length / 2, 0);
    const [x2, y2] = at(length / 2, 0);
    const parts = [`M${fmt(x1)} ${fmt(y1)}L${fmt(x2)} ${fmt(y2)}`];
    if (!slope) {
      const head = length * 0.3;
      const back = head * Math.cos(HEAD_ANGLE);
      const side = head * Math.sin(HEAD_ANGLE);
      const [lx, ly] = at(length / 2 - back, side);
      const [rx, ry] = at(length / 2 - back, -side);
      parts.push(`M${fmt(lx)} ${fmt(ly)}L${fmt(x2)} ${fmt(y2)}L${fmt(rx)} ${fmt(ry)}`);
    }
    commands[shade].push(parts.join(""));
  }
  return commands.flatMap((list, i) => (list.length ? [{ d: list.join(""), opacity: SHADES[i] }] : []));
}
