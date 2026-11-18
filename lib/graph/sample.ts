/**
 * Samples y = f(x) into drawable polyline segments. Unlike a naive polyline,
 * the curve is split where the function is undefined (sqrt(x) for x < 0) and
 * at jump discontinuities and vertical asymptotes (tan(x), 1/x, floor(x)), so
 * no false connecting lines are drawn. Segment ends next to an undefined
 * region are refined so curves reach their true domain boundary.
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
/** A jump larger than this fraction of the visible height is examined. */
const JUMP_FRACTION = 0.05;

export function sampleFunction(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  { samples, yMin, yMax }: SampleOptions,
): Segment[] {
  const segments: Segment[] = [];
  if (!(xMax > xMin) || samples < 1) return segments;

  const threshold = Math.max((yMax - yMin) * JUMP_FRACTION, Number.EPSILON);
  const step = (xMax - xMin) / samples;
  let current: Segment = [];
  let prevX = NaN;
  let prevY = NaN;

  const finish = () => {
    if (current.length >= 2) segments.push(current);
    current = [];
  };

  for (let i = 0; i <= samples; i++) {
    const x = i === samples ? xMax : xMin + i * step;
    const y = fn(x);
    const finite = Number.isFinite(y);
    const prevFinite = Number.isFinite(prevY);

    if (i > 0) {
      if (prevFinite && finite) {
        if (isDiscontinuous(fn, prevX, prevY, x, y, threshold)) finish();
      } else if (prevFinite && !finite) {
        current.push(findEdge(fn, prevX, x));
        finish();
      } else if (!prevFinite && finite) {
        current.push(findEdge(fn, x, prevX));
      }
    }

    if (finite) current.push([x, y]);
    prevX = x;
    prevY = y;
  }

  finish();
  return segments;
}

/**
 * Decides whether a large change between two samples is a real discontinuity
 * by repeatedly halving the interval toward the steepest part. A continuous
 * function's change shrinks below the threshold; a jump or asymptote does not.
 */
function isDiscontinuous(
  fn: (x: number) => number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  threshold: number,
): boolean {
  if (Math.abs(y2 - y1) <= threshold) return false;
  let a = x1;
  let ya = y1;
  let b = x2;
  let yb = y2;
  for (let i = 0; i < REFINE_STEPS; i++) {
    const m = (a + b) / 2;
    const ym = fn(m);
    if (!Number.isFinite(ym)) return true;
    if (Math.abs(ym - ya) > Math.abs(yb - ym)) {
      b = m;
      yb = ym;
    } else {
      a = m;
      ya = ym;
    }
    if (Math.abs(yb - ya) <= threshold) return false;
  }
  return true;
}

/** Bisects toward the boundary between a defined x and an undefined x. */
function findEdge(fn: (x: number) => number, definedX: number, undefinedX: number): Point {
  let a = definedX;
  let b = undefinedX;
  for (let i = 0; i < REFINE_STEPS; i++) {
    const m = (a + b) / 2;
    if (Number.isFinite(fn(m))) a = m;
    else b = m;
  }
  return [a, fn(a)];
}

/** SVG path data for the segments, with y clamped so far-off points stay drawable. */
export function segmentsToPath(segments: Segment[], yMin: number, yMax: number): string {
  const span = yMax - yMin;
  const lo = yMin - 10 * span;
  const hi = yMax + 10 * span;
  return segments
    .map((segment) =>
      segment
        .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${Math.min(Math.max(y, lo), hi)}`)
        .join(" "),
    )
    .join(" ");
}
