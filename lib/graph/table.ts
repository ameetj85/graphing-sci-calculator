/** Rows of x and f(x) values for the value table. */
export type TableRow = { x: number; values: number[] };

export const TABLE_ROWS = 11;

/** x values start, start + step, ... with floating-point noise removed (0.1 + 0.2 → 0.3). */
export function tableXs(start: number, step: number, count = TABLE_ROWS): number[] {
  return Array.from({ length: count }, (_, i) => Number((start + i * step).toPrecision(12)));
}

export function tableRows(fns: Array<(x: number) => number>, start: number, step: number, count = TABLE_ROWS): TableRow[] {
  return tableXs(start, step, count).map((x) => ({ x, values: fns.map((fn) => fn(x)) }));
}

/** Index of the row closest to x if x is within half a step of it, else -1. */
export function rowIndexNear(xs: number[], x: number, step: number): number {
  let best = -1;
  let bestDistance = Math.abs(step) / 2;
  xs.forEach((value, i) => {
    const distance = Math.abs(value - x);
    if (distance <= bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}
