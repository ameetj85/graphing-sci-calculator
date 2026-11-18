/**
 * Samples curves into drawable polyline segments. Unlike a naive polyline,
 * a curve is split where it is undefined (sqrt(x) for x < 0) and at jump
 * discontinuities and asymptotes (tan(x), 1/x, floor(x)), so no false
 * connecting lines are drawn. Segment ends next to an undefined region are
 * refined so curves reach their true domain boundary.
 */
export type Point = [number, number];
export type Segment = Point[];

export type SampleOptions = {
  /** Number of evenly spaced intervals across [xMin, xMax]. */
  samples: number;
  /** Visible y-range, used to scale the jump-detection threshold. */
  yMin: number;
  yMax: number;
};

const REFINE_STEPS = 40;
/** A jump larger than this fraction of the visible size is examined. */
const JUMP_FRACTION = 0.05;

type Evaluate = (t: number) => Point;
type Distance = (a: Point, b: Point) => number;

const isFinitePoint = (p: Point) => Number.isFinite(p[0]) && Number.isFinite(p[1]);

/**
 * Shared sampler over a parameter t. `distance` measures how far apart two
 * samples are; a large distance is checked for a real discontinuity.
 */
function sampleCurve(
  evaluate: Evaluate,
  tMin: number,
  tMax: number,
  samples: number,
  distance: Distance,
  threshold: number,
): Segment[] {
  const segments: Segment[] = [];
  if (!(tMax > tMin) || samples < 1) return segments;

  const step = (tMax - tMin) / samples;
  let current: Segment = [];
  let prevT = NaN;
  let prev: Point = [NaN, NaN];

  const finish = () => {
    if (current.length >= 2) segments.push(current);
    current = [];
  };

  for (let i = 0; i <= samples; i++) {
    const t = i === samples ? tMax : tMin + i * step;
    const point = evaluate(t);
    const finite = isFinitePoint(point);
    const prevFinite = isFinitePoint(prev);

    if (i > 0) {
      if (prevFinite && finite) {
        if (isDiscontinuous(evaluate, prevT, prev, t, point, distance, threshold)) finish();
      } else if (prevFinite && !finite) {
        current.push(findEdge(evaluate, prevT, t));
        finish();
      } else if (!prevFinite && finite) {
        current.push(findEdge(evaluate, t, prevT));
      }
    }

    if (finite) current.push(point);
    prevT = t;
    prev = point;
  }

  finish();
  return segments;
}

/**
 * Decides whether a large gap between two samples is a real discontinuity by
 * repeatedly halving the interval toward the larger gap. A continuous curve's
 * gap shrinks below the threshold; a jump or asymptote does not.
 */
function isDiscontinuous(
  evaluate: Evaluate,
  t1: number,
  p1: Point,
  t2: number,
  p2: Point,
  distance: Distance,
  threshold: number,
): boolean {
  if (distance(p1, p2) <= threshold) return false;
  let a = t1;
  let pa = p1;
  let b = t2;
  let pb = p2;
  for (let i = 0; i < REFINE_STEPS; i++) {
    const m = (a + b) / 2;
    const pm = evaluate(m);
    if (!isFinitePoint(pm)) return true;
    if (distance(pa, pm) > distance(pm, pb)) {
      b = m;
      pb = pm;
    } else {
      a = m;
      pa = pm;
    }
    if (distance(pa, pb) <= threshold) return false;
  }
  return true;
}

/** Bisects toward the boundary between a defined t and an undefined t. */
function findEdge(evaluate: Evaluate, definedT: number, undefinedT: number): Point {
  let a = definedT;
  let b = undefinedT;
  for (let i = 0; i < REFINE_STEPS; i++) {
    const m = (a + b) / 2;
    if (isFinitePoint(evaluate(m))) a = m;
    else b = m;
  }
  return evaluate(a);
}

/** Samples y = f(x) across [xMin, xMax]. Jumps are measured vertically. */
export function sampleFunction(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  { samples, yMin, yMax }: SampleOptions,
): Segment[] {
  const threshold = Math.max((yMax - yMin) * JUMP_FRACTION, Number.EPSILON);
  return sampleCurve((x) => [x, fn(x)], xMin, xMax, samples, (a, b) => Math.abs(b[1] - a[1]), threshold);
}

/**
 * Samples a parametric curve (x(t), y(t)) across [tMin, tMax]. Jumps are
 * measured as straight-line distance relative to `viewSize`.
 */
export function sampleParametric(
  xy: (t: number) => Point,
  tMin: number,
  tMax: number,
  samples: number,
  viewSize: number,
): Segment[] {
  const threshold = Math.max(viewSize * JUMP_FRACTION, Number.EPSILON);
  return sampleCurve(xy, tMin, tMax, samples, (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]), threshold);
}

const clampTo = (value: number, lo: number, hi: number) => Math.min(Math.max(value, lo), hi);

/** SVG path data for the segments, with y clamped so far-off points stay drawable. */
export function segmentsToPath(segments: Segment[], yMin: number, yMax: number, xRange?: [number, number]): string {
  const span = yMax - yMin;
  const [loY, hiY] = [yMin - 10 * span, yMax + 10 * span];
  const xSpan = xRange ? xRange[1] - xRange[0] : 0;
  const clampX = (x: number) => (xRange ? clampTo(x, xRange[0] - 10 * xSpan, xRange[1] + 10 * xSpan) : x);
  return segments
    .map((segment) =>
      segment.map(([x, y], i) => `${i === 0 ? "M" : "L"}${clampX(x)} ${clampTo(y, loY, hiY)}`).join(" "),
    )
    .join(" ");
}

/**
 * Filled region for y > f(x) (or y < f(x)) from sampled boundary segments:
 * each segment is closed against a horizontal line beyond the visible area.
 */
export function inequalityFillPath(segments: Segment[], above: boolean, yMin: number, yMax: number): string {
  const span = yMax - yMin;
  const edge = above ? yMax + span : yMin - span;
  const [lo, hi] = [yMin - 10 * span, yMax + 10 * span];
  return segments
    .map((segment) => {
      const first = segment[0][0];
      const last = segment[segment.length - 1][0];
      const boundary = segment.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${clampTo(y, lo, hi)}`).join(" ");
      return `${boundary} L${last} ${edge} L${first} ${edge} Z`;
    })
    .join(" ");
}
