/**
 * Numerical calculus on plain functions of one variable: derivatives,
 * definite integrals, roots and local extrema. Everything returns NaN, null
 * or an empty list rather than throwing, so callers decide how to report a
 * failure (an error in an expression, a gap in a graph).
 */
export type Fn = (x: number) => number;

/**
 * f'(a) by the five-point central difference, accurate to about 1e-10 for
 * smooth functions. NaN if f is undefined anywhere in [a - 2h, a + 2h].
 */
export function derivativeAt(f: Fn, a: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(f(a))) return NaN;
  const h = 1e-3 * Math.max(1, Math.abs(a));
  const value = (-f(a + 2 * h) + 8 * f(a + h) - 8 * f(a - h) + f(a - 2 * h)) / (12 * h);
  return Number.isFinite(value) ? value : NaN;
}

// Gauss–Kronrod 7/15 nodes and weights on [-1, 1] (non-negative half).
const XGK = [
  0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926,
  0.741531185599394439863864773280788, 0.58608723546769113029414483825873, 0.405845151377397166906606412076961,
  0.207784955007898467600689403773245, 0,
];
const WGK = [
  0.02293532201052922496373200805897, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518,
  0.140653259715525918745189590510238, 0.16900472663926790282658342659855, 0.190350578064785409913256402421014,
  0.204432940075298892414161999234649, 0.209482141084727828012999174891714,
];
const WG = [0.129484966168869693270611432679082, 0.27970539148927666790146777142378, 0.381830050505118944950369775488975, 0.417959183673469387755102040816327];

/** One Gauss–Kronrod 15-point estimate of ∫ f over [a, b], with an error estimate. */
function kronrod(f: Fn, a: number, b: number): { value: number; error: number } {
  const center = (a + b) / 2;
  const half = (b - a) / 2;
  const fc = f(center);
  let kronrodSum = fc * WGK[7];
  let gaussSum = fc * WG[3];
  for (let j = 0; j < 7; j++) {
    const dx = half * XGK[j];
    const pair = f(center - dx) + f(center + dx);
    kronrodSum += WGK[j] * pair;
    if (j % 2 === 1) gaussSum += WG[(j - 1) / 2] * pair;
  }
  return { value: kronrodSum * half, error: Math.abs((kronrodSum - gaussSum) * half) };
}

const MAX_INTERVALS = 400;

/**
 * ∫ f(x) dx from a to b by adaptive Gauss–Kronrod quadrature. The nodes
 * never touch the ends, so integrable endpoint singularities such as
 * 1/sqrt(x) from 0 work. NaN if f is undefined inside the interval, the
 * bounds aren't finite, or the result doesn't settle.
 */
export function integrate(f: Fn, a: number, b: number, tolerance = 1e-10): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
  if (a === b) return 0;
  if (a > b) return -integrate(f, b, a, tolerance);

  // Split the worst interval until the total error estimate is small enough.
  const intervals = [{ a, b, ...kronrod(f, a, b) }];
  for (;;) {
    let total = 0;
    let error = 0;
    let worst = 0;
    for (let i = 0; i < intervals.length; i++) {
      total += intervals[i].value;
      error += intervals[i].error;
      if (intervals[i].error > intervals[worst].error) worst = i;
    }
    if (!Number.isFinite(total)) return NaN;
    if (error <= Math.max(tolerance, tolerance * Math.abs(total))) return total;
    if (intervals.length >= MAX_INTERVALS) return error <= 1e-6 * Math.max(1, Math.abs(total)) ? total : NaN;
    const { a: lo, b: hi } = intervals[worst];
    const mid = (lo + hi) / 2;
    intervals.splice(worst, 1, { a: lo, b: mid, ...kronrod(f, lo, mid) }, { a: mid, b: hi, ...kronrod(f, mid, hi) });
  }
}

const BISECT_STEPS = 200;

/** A root of f in [a, b] where f(a) and f(b) have opposite signs (bisection with secant steps), or null. */
export function rootInBracket(f: Fn, a: number, b: number): number | null {
  let lo = Math.min(a, b);
  let hi = Math.max(a, b);
  let fLo = f(lo);
  const fHi = f(hi);
  if (fLo === 0) return lo;
  if (fHi === 0) return hi;
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || Math.sign(fLo) === Math.sign(fHi)) return null;
  for (let i = 0; i < BISECT_STEPS && hi - lo > 4 * Number.EPSILON * Math.max(1, Math.abs(lo)); i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (fMid === 0) return mid;
    if (!Number.isFinite(fMid)) return null;
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  const root = (lo + hi) / 2;
  // A sign change across a pole (1/x at 0) or a jump is not a root: there
  // |f| stays large instead of shrinking to a tiny fraction of its value at
  // the ends.
  return Math.abs(f(root)) <= 1e-3 * Math.max(Math.abs(f(a)), Math.abs(f(b))) ? root : null;
}

/**
 * A root of f near `guess`: Newton's method first, then a search outward
 * from the guess for a sign change, which is narrowed by bisection.
 * Returns null if neither finds one.
 */
export function rootNear(f: Fn, guess: number): number | null {
  if (!Number.isFinite(guess)) return null;

  let x = guess;
  for (let i = 0; i < 100; i++) {
    const fx = f(x);
    if (!Number.isFinite(fx)) break;
    if (fx === 0) return clean(x);
    const slope = derivativeAt(f, x);
    if (!Number.isFinite(slope) || slope === 0) break;
    const next = x - fx / slope;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - x) <= 1e-14 * Math.max(1, Math.abs(x))) {
      return Math.abs(f(next)) <= 1e-9 * Math.max(1, Math.abs(f(guess))) ? clean(next) : null;
    }
    x = next;
  }

  // Newton failed: look for the nearest sign change, widening the search.
  let step = 0.01 * Math.max(1, Math.abs(guess));
  let left = guess;
  let right = guess;
  let fLeft = f(left);
  let fRight = fLeft;
  for (let i = 0; i < 2000 && step < 1e8; i++) {
    const nextLeft = left - step;
    const nextRight = right + step;
    const fNextLeft = f(nextLeft);
    const fNextRight = f(nextRight);
    for (const [p, fp, q, fq] of [
      [right, fRight, nextRight, fNextRight],
      [nextLeft, fNextLeft, left, fLeft],
    ]) {
      if (Number.isFinite(fp) && Number.isFinite(fq) && Math.sign(fp) !== Math.sign(fq)) {
        const root = rootInBracket(f, p, q);
        if (root !== null) return clean(root);
      }
    }
    left = nextLeft;
    right = nextRight;
    fLeft = fNextLeft;
    fRight = fNextRight;
    step *= 1.1;
  }
  return null;
}

/** Turns -0 and values within rounding noise of 0 into 0. */
const clean = (x: number) => (Math.abs(x) < 1e-15 ? 0 : x);

const GOLDEN = (Math.sqrt(5) - 1) / 2;

/** The x in [a, b] where sign * f is largest, by golden-section search; null if f is undefined there. */
function goldenMax(f: Fn, a: number, b: number, sign: 1 | -1): number | null {
  let lo = a;
  let hi = b;
  let x1 = hi - GOLDEN * (hi - lo);
  let x2 = lo + GOLDEN * (hi - lo);
  let f1 = sign * f(x1);
  let f2 = sign * f(x2);
  for (let i = 0; i < 100 && hi - lo > 1e-12 * Math.max(1, Math.abs(lo)); i++) {
    if (!Number.isFinite(f1) || !Number.isFinite(f2)) return null;
    if (f1 > f2) {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - GOLDEN * (hi - lo);
      f1 = sign * f(x1);
    } else {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + GOLDEN * (hi - lo);
      f2 = sign * f(x2);
    }
  }
  return (lo + hi) / 2;
}

export type Extremum = { x: number; y: number; kind: "max" | "min" };

/**
 * Local maxima and minima of f over (xMin, xMax), found from `samples`
 * evenly spaced values and refined by golden-section search. Peaks next to
 * an asymptote or jump (tan x, floor x) are rejected because refining them
 * runs off toward the discontinuity instead of settling near the sample.
 */
export function findExtrema(f: Fn, xMin: number, xMax: number, samples: number, yTolerance: number): Extremum[] {
  const found: Extremum[] = [];
  if (!(xMax > xMin) || samples < 2) return found;
  const step = (xMax - xMin) / samples;
  const ys: number[] = [];
  for (let i = 0; i <= samples; i++) ys.push(f(xMin + i * step));

  for (let i = 1; i < samples; i++) {
    const [a, b] = [ys[i - 1], ys[i]];
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) continue;
    // Skip past a run of equal samples; the value after it decides the kind.
    let j = i + 1;
    while (j <= samples && ys[j] === b) j++;
    if (j > samples) break;
    const c = ys[j];
    if (!Number.isFinite(c)) continue;
    const kind = b > a && b > c ? "max" : b < a && b < c ? "min" : null;
    if (!kind) continue;
    const x = goldenMax(f, xMin + (i - 1) * step, xMin + j * step, kind === "max" ? 1 : -1);
    if (x === null) continue;
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(y - b) > yTolerance + Math.abs(a - c)) continue;
    // A real extremum has a level tangent; a peak at a jump does not.
    const slope = derivativeAt(f, x);
    if (Number.isFinite(slope) && Math.abs(slope) * step > Math.max(yTolerance, Math.abs(a - b) + Math.abs(c - b))) continue;
    found.push({ x, y, kind });
  }
  return found;
}
