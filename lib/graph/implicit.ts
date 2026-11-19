/**
 * Implicit curves F(x, y) = 0 (from equations such as x^2 + y^2 = 4) by
 * marching squares: F is sampled on a grid, and each cell where F changes
 * sign gets a line segment between its edge crossings.
 *
 * Curves where F touches zero without changing sign, such as
 * (x^2 + y^2 - 4)^2 = 0, have no sign changes to find. For those, each grid
 * line is searched for places where |F| dips to zero between neighbours of
 * the same sign; cells without a sign change join those points instead.
 */
import { isTouchCandidate, minimizeAbs } from "./keyPoints";

/** |F| at a touch point must be this small relative to the neighbouring samples. */
const TOUCH_TOLERANCE = 1e-6;
const TOUCH_STEPS = 50;

/**
 * Returns line segments as a flat array [x1, y1, x2, y2, …]. Cells touching
 * an undefined value are skipped, and so are sign changes that come from a
 * pole rather than a root (1/x = y changes sign at x = 0 without crossing 0).
 */
export function traceImplicit(
  F: (x: number, y: number) => number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  cols: number,
  rows: number,
): Float64Array {
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

  // Touch points on grid lines, keyed by the edge they fall on.
  // Horizontal edge (i, j) runs from node (i, j) to (i + 1, j); vertical edge (i, j) from (i, j) to (i, j + 1).
  const hTouch = new Map<number, [number, number]>();
  const vTouch = new Map<number, [number, number]>();
  const findTouch = (line: (t: number) => number, t0: number, step: number, values: (k: number) => number, count: number, store: (k: number, t: number) => void) => {
    for (let k = 1; k < count; k++) {
      const a = values(k - 1);
      const b = values(k);
      const c = values(k + 1);
      if (!isTouchCandidate(a, b, c)) continue;
      const t = minimizeAbs(line, t0 + (k - 1) * step, t0 + (k + 1) * step, TOUCH_STEPS);
      if (t === null) continue;
      if (Math.abs(line(t)) <= TOUCH_TOLERANCE * Math.max(Math.abs(a), Math.abs(c))) {
        store(Math.min(count - 1, Math.max(0, Math.floor((t - t0) / step))), t);
      }
    }
  };
  for (let j = 0; j <= rows; j++) {
    const y = yMin + j * dy;
    findTouch((x) => F(x, y), xMin, dx, (k) => values[j * stride + k], cols, (i, x) => hTouch.set(j * stride + i, [x, y]));
  }
  for (let i = 0; i <= cols; i++) {
    const x = xMin + i * dx;
    findTouch((y) => F(x, y), yMin, dy, (k) => values[k * stride + i], rows, (j, y) => vTouch.set(j * stride + i, [x, y]));
  }

  const out: number[] = [];
  const positive = (v: number) => v >= 0;

  /** Where F crosses 0 between two corners, or null for a pole. */
  const crossing = (x1: number, y1: number, f1: number, x2: number, y2: number, f2: number): [number, number] | null => {
    const t = f1 / (f1 - f2);
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const check = F(x, y);
    if (!Number.isFinite(check) || Math.abs(check) > Math.max(Math.abs(f1), Math.abs(f2))) return null;
    return [x, y];
  };

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = values[j * stride + i]; // bottom left
      const b = values[j * stride + i + 1]; // bottom right
      const c = values[(j + 1) * stride + i + 1]; // top right
      const d = values[(j + 1) * stride + i]; // top left
      if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c) || Number.isNaN(d)) continue;
      const pa = positive(a);
      const pb = positive(b);
      const pc = positive(c);
      const pd = positive(d);
      if (pa === pb && pb === pc && pc === pd) {
        // No sign change: join any touch points on this cell's edges, in order around it.
        const touches = [
          hTouch.get(j * stride + i),
          vTouch.get(j * stride + i + 1),
          hTouch.get((j + 1) * stride + i),
          vTouch.get(j * stride + i),
        ].filter((p): p is [number, number] => p !== undefined);
        for (let k = 0; k + 1 < touches.length; k += 2) {
          out.push(touches[k][0], touches[k][1], touches[k + 1][0], touches[k + 1][1]);
        }
        continue;
      }

      const x0 = xMin + i * dx;
      const y0 = yMin + j * dy;
      const x1 = x0 + dx;
      const y1 = y0 + dy;
      const bottom = pa !== pb ? crossing(x0, y0, a, x1, y0, b) : null;
      const right = pb !== pc ? crossing(x1, y0, b, x1, y1, c) : null;
      const top = pd !== pc ? crossing(x0, y1, d, x1, y1, c) : null;
      const left = pa !== pd ? crossing(x0, y0, a, x0, y1, d) : null;

      const add = (p: [number, number] | null, q: [number, number] | null) => {
        if (p && q) out.push(p[0], p[1], q[0], q[1]);
      };
      const count = Number(pa !== pb) + Number(pb !== pc) + Number(pd !== pc) + Number(pa !== pd);
      if (count === 4) {
        // Saddle: the value at the centre decides which corners are joined.
        const centre = positive(F(x0 + dx / 2, y0 + dy / 2));
        if (centre === pa) {
          add(bottom, right);
          add(top, left);
        } else {
          add(left, bottom);
          add(right, top);
        }
      } else {
        const points = [bottom, right, top, left].filter((p, k) => [pa !== pb, pb !== pc, pd !== pc, pa !== pd][k]);
        add(points[0], points[1]);
      }
    }
  }
  return Float64Array.from(out);
}

/** SVG path data for segments from traceImplicit. */
export function segmentsPath(segments: Float64Array): string {
  const parts: string[] = [];
  for (let k = 0; k + 3 < segments.length; k += 4) {
    parts.push(`M${segments[k]} ${segments[k + 1]}L${segments[k + 2]} ${segments[k + 3]}`);
  }
  return parts.join("");
}
