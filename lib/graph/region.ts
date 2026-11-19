/**
 * Shaded regions for inequalities that aren't y > f(x), such as x > 2,
 * x^2 + y^2 < 4 or the chain 1 < x < 2. A region is where every condition
 * F(x, y) op 0 holds. The conditions are sampled on a grid; cells entirely
 * inside are merged into runs along each row, and boundary cells are clipped
 * by each condition in turn (Sutherland–Hodgman, cutting each edge where F is
 * linearly interpolated to zero).
 */
import { joinSegments, traceImplicit } from "./implicit";
import type { Comparison } from "./plotSpec";

export type Condition = { F: (x: number, y: number) => number; op: Comparison };

const holds = (value: number, op: Comparison): boolean =>
  op === "<" ? value < 0 : op === "<=" ? value <= 0 : op === ">" ? value > 0 : value >= 0;

/** The same test with the edge included, for deciding where an edge borders the region. */
const holdsOrOnEdge = (value: number, op: Comparison): boolean => (op === "<" || op === "<=" ? value <= 0 : value >= 0);

type Point = [number, number];

const CLIP_STEPS = 40;

/**
 * The part of segment pq where every condition holds (edge included): the
 * whole segment, null, or the segment cut where a condition's F crosses zero.
 * Kept endpoints are unchanged, so joining still works along the region.
 */
function clipSegment(p: Point, q: Point, conditions: Condition[]): [Point, Point] | null {
  const pIn = conditions.every((c) => holdsOrOnEdge(c.F(p[0], p[1]), c.op));
  const qIn = conditions.every((c) => holdsOrOnEdge(c.F(q[0], q[1]), c.op));
  if (pIn && qIn) return [p, q];
  if (!pIn && !qIn) return null;
  const [inside, outside] = pIn ? [p, q] : [q, p];
  // Bisect for where the segment leaves the region (exact even when a condition is curved).
  const at = (t: number): Point => [inside[0] + (outside[0] - inside[0]) * t, inside[1] + (outside[1] - inside[1]) * t];
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < CLIP_STEPS; i++) {
    const mid = (lo + hi) / 2;
    const [x, y] = at(mid);
    if (conditions.every((c) => holdsOrOnEdge(c.F(x, y), c.op))) lo = mid;
    else hi = mid;
  }
  const cut = at(lo);
  return pIn ? [p, cut] : [cut, q];
}

/** Clips a polygon to F op 0. */
function clip(polygon: Point[], { F, op }: Condition): Point[] {
  const values = polygon.map(([x, y]) => F(x, y));
  const inside = values.map((v) => Number.isFinite(v) && holds(v, op));
  const out: Point[] = [];
  for (let k = 0; k < polygon.length; k++) {
    const next = (k + 1) % polygon.length;
    if (inside[k]) out.push(polygon[k]);
    if (inside[k] !== inside[next] && Number.isFinite(values[k]) && Number.isFinite(values[next])) {
      const a = values[k];
      const b = values[next];
      const t = a === b ? 0.5 : Math.min(1, Math.max(0, a / (a - b)));
      out.push([polygon[k][0] + (polygon[next][0] - polygon[k][0]) * t, polygon[k][1] + (polygon[next][1] - polygon[k][1]) * t]);
    }
  }
  return out;
}

/** SVG path data (in graph coordinates) covering where every condition holds. */
export function shadeRegion(
  conditions: Condition[],
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
  // Per node: 1 if every condition holds, 0 if not, -1 if any is undefined.
  const state = new Int8Array(stride * (rows + 1));
  for (let j = 0; j <= rows; j++) {
    const y = yMin + j * dy;
    for (let i = 0; i <= cols; i++) {
      const x = xMin + i * dx;
      let s = 1;
      for (const { F, op } of conditions) {
        const v = F(x, y);
        if (!Number.isFinite(v)) {
          s = -1;
          break;
        }
        if (!holds(v, op)) s = 0;
      }
      state[j * stride + i] = s;
    }
  }

  const parts: string[] = [];
  const rect = (x0: number, y0: number, x1: number, y1: number) => parts.push(`M${x0} ${y0}H${x1}V${y1}H${x0}Z`);

  for (let j = 0; j < rows; j++) {
    // From the index, so rows share exact coordinates.
    const y0 = yMin + j * dy;
    const y1 = yMin + (j + 1) * dy;
    let runStart = -1;
    const endRun = (i: number) => {
      if (runStart >= 0) rect(xMin + runStart * dx, y0, xMin + i * dx, y1);
      runStart = -1;
    };
    for (let i = 0; i < cols; i++) {
      const corners = [state[j * stride + i], state[j * stride + i + 1], state[(j + 1) * stride + i + 1], state[(j + 1) * stride + i]];
      if (corners.every((s) => s === 1)) {
        if (runStart < 0) runStart = i;
        continue;
      }
      endRun(i);
      if (!corners.includes(1) || corners.includes(-1)) continue;

      const x0 = xMin + i * dx;
      const x1 = xMin + (i + 1) * dx;
      let polygon: Point[] = [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ];
      for (const condition of conditions) {
        polygon = clip(polygon, condition);
        if (polygon.length < 3) break;
      }
      if (polygon.length >= 3) parts.push(`M${polygon.map(([x, y]) => `${x} ${y}`).join("L")}Z`);
    }
    endRun(cols);
  }
  return parts.join("");
}

/**
 * The edge F = 0 of each condition, kept only where it borders the region
 * (where the other conditions hold), as joined polylines [x1, y1, x2, y2, …].
 */
export function regionBoundaries(
  conditions: Condition[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  cols: number,
  rows: number,
): number[][][] {
  return conditions.map(({ F }, index) => {
    const segments = traceImplicit(F, xMin, xMax, yMin, yMax, cols, rows);
    const others = conditions.filter((_, k) => k !== index);
    if (others.length === 0) return joinSegments(segments);
    const kept: number[] = [];
    for (let k = 0; k + 3 < segments.length; k += 4) {
      const clipped = clipSegment([segments[k], segments[k + 1]], [segments[k + 2], segments[k + 3]], others);
      if (clipped) kept.push(...clipped[0], ...clipped[1]);
    }
    return joinSegments(Float64Array.from(kept));
  });
}
