/**
 * Numerical roots and curve intersections over a visible x-range. Sign
 * changes between samples are refined by bisection, then verified so the
 * sign flip across an asymptote (tan x, 1/x) is not reported as a root.
 */
export type KeyPoint = {
  x: number;
  y: number;
  kind: "root" | "intersection";
  /** Ids of the curves involved: one for a root, two for an intersection. */
  curveIds: string[];
};

export type Curve = { id: string; fn: (x: number) => number };

const BISECT_STEPS = 60;
const MAX_POINTS = 60;

/** x-values in [xMin, xMax] where h(x) = 0. `tolerance` bounds |h| at an accepted root. */
export function findZeros(
  h: (x: number) => number,
  xMin: number,
  xMax: number,
  samples: number,
  tolerance: number,
): number[] {
  const zeros: number[] = [];
  if (!(xMax > xMin) || samples < 1) return zeros;
  const step = (xMax - xMin) / samples;
  const minGap = step / 2;

  const push = (x: number) => {
    if (zeros.length === 0 || Math.abs(x - zeros[zeros.length - 1]) > minGap) zeros.push(x);
  };

  let prevX = xMin;
  let prevH = h(xMin);
  if (prevH === 0) push(xMin);

  for (let i = 1; i <= samples; i++) {
    const x = i === samples ? xMax : xMin + i * step;
    const hx = h(x);
    if (hx === 0) {
      push(x);
    } else if (Number.isFinite(prevH) && Number.isFinite(hx) && prevH !== 0 && Math.sign(prevH) !== Math.sign(hx)) {
      const root = bisect(h, prevX, prevH, x);
      if (root !== null && Math.abs(h(root)) <= tolerance) push(root);
    }
    prevX = x;
    prevH = hx;
  }
  return zeros;
}

function bisect(h: (x: number) => number, a: number, ha: number, b: number): number | null {
  let lo = a;
  let hLo = ha;
  let hi = b;
  for (let i = 0; i < BISECT_STEPS; i++) {
    const mid = (lo + hi) / 2;
    const hMid = h(mid);
    if (!Number.isFinite(hMid)) return null;
    if (hMid === 0) return mid;
    if (Math.sign(hMid) === Math.sign(hLo)) {
      lo = mid;
      hLo = hMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/** Roots of each curve and intersections of each pair of curves in the range. */
export function findKeyPoints(
  curves: Curve[],
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  samples = 600,
): KeyPoint[] {
  const tolerance = Math.max(yMax - yMin, 1) * 1e-6;
  const points: KeyPoint[] = [];

  for (const curve of curves) {
    for (const x of findZeros(curve.fn, xMin, xMax, samples, tolerance)) {
      points.push({ x, y: 0, kind: "root", curveIds: [curve.id] });
    }
  }

  for (let i = 0; i < curves.length; i++) {
    for (let j = i + 1; j < curves.length; j++) {
      const f = curves[i].fn;
      const g = curves[j].fn;
      for (const x of findZeros((t) => f(t) - g(t), xMin, xMax, samples, tolerance)) {
        const y = f(x);
        if (Number.isFinite(y)) points.push({ x, y, kind: "intersection", curveIds: [curves[i].id, curves[j].id] });
      }
    }
  }

  return points.slice(0, MAX_POINTS);
}

/** The closest x to `x0` (searching outward in `step`s) where fn is defined, or null. */
export function nearestDefinedX(fn: (x: number) => number, x0: number, step: number, maxSteps = 500): number | null {
  if (Number.isFinite(fn(x0))) return x0;
  for (let k = 1; k <= maxSteps; k++) {
    if (Number.isFinite(fn(x0 + k * step))) return x0 + k * step;
    if (Number.isFinite(fn(x0 - k * step))) return x0 - k * step;
  }
  return null;
}

/** Rounds for display, removing floating-point noise such as 1.9999999999. */
export function formatCoordinate(value: number): string {
  if (Math.abs(value) < 1e-10) return "0";
  return Number(value.toPrecision(6)).toString();
}
