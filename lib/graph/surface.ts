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
