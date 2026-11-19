/** Sampling for 3D surfaces z = f(x, y). */

export type Domain = { xMin: number; xMax: number; yMin: number; yMax: number };

/**
 * Samples f on an (n + 1) × (n + 1) grid over the domain. Values are stored
 * row by row (y outer, x inner); non-finite results become NaN.
 */
export function sampleSurface(fn: (x: number, y: number) => number, domain: Domain, n: number): Float64Array {
  const { xMin, xMax, yMin, yMax } = domain;
  const size = n + 1;
  const z = new Float64Array(size * size);
  for (let j = 0; j < size; j++) {
    const y = yMin + ((yMax - yMin) * j) / n;
    for (let i = 0; i < size; i++) {
      const x = xMin + ((xMax - xMin) * i) / n;
      const value = fn(x, y);
      z[j * size + i] = Number.isFinite(value) ? value : NaN;
    }
  }
  return z;
}

/**
 * The z-range to show for some sampled grids. Spikes near poles
 * (1 / (x^2 + y^2)) would flatten everything else, so when the extremes are
 * far outside the bulk of the values the range is cut to the 2nd–98th
 * percentiles. Returns null when nothing is defined.
 */
export function zRange(grids: Float64Array[]): { min: number; max: number } | null {
  const values: number[] = [];
  for (const grid of grids) for (const v of grid) if (!Number.isNaN(v)) values.push(v);
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  let min = values[0];
  let max = values[values.length - 1];
  const low = values[Math.floor(values.length * 0.02)];
  const high = values[Math.ceil(values.length * 0.98) - 1];
  if (high > low && max - min > 4 * (high - low)) {
    const pad = (high - low) * 0.1;
    min = Math.max(min, low - pad);
    max = Math.min(max, high + pad);
  }
  if (max - min < 1e-12) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    return { min: min - pad, max: max + pad };
  }
  return { min, max };
}

/** A drawn grid cell, kept so the pointer can be mapped back to the surface. */
export type Quad = { depth: number; points: number[]; fill: string; stroke: string; surfaceId: string; i: number; j: number };

/**
 * Finds the nearest drawn cell under (px, py) and returns its fractional grid
 * position, from barycentric coordinates in one of the cell's two triangles.
 */
export function hitTest(quads: Quad[], px: number, py: number): { quad: Quad; gi: number; gj: number } | null {
  for (let k = quads.length - 1; k >= 0; k--) {
    const quad = quads[k];
    const p = quad.points;
    // Corners a (i, j), b (i + 1, j), c (i + 1, j + 1), d (i, j + 1) as grid offsets.
    const grid = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    for (const [u, v, w] of [
      [0, 1, 2],
      [0, 2, 3],
    ]) {
      const [x1, y1, x2, y2, x3, y3] = [p[2 * u], p[2 * u + 1], p[2 * v], p[2 * v + 1], p[2 * w], p[2 * w + 1]];
      const det = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / det;
      const l2 = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / det;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const gi = quad.i + l1 * grid[u][0] + l2 * grid[v][0] + l3 * grid[w][0];
      const gj = quad.j + l1 * grid[u][1] + l2 * grid[v][1] + l3 * grid[w][1];
      return { quad, gi, gj };
    }
  }
  return null;
}
