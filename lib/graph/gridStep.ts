/**
 * Grid spacing that keeps axis labels readable at any zoom level: the
 * smallest 1, 2 or 5 × 10^k units that is at least `minPixels` apart.
 */
export function niceStep(pixelsPerUnit: number, minPixels = 48): number {
  if (!(pixelsPerUnit > 0) || !Number.isFinite(pixelsPerUnit)) return 1;
  const minUnits = minPixels / pixelsPerUnit;
  const power = 10 ** Math.floor(Math.log10(minUnits));
  for (const multiple of [1, 2, 5, 10]) {
    if (multiple * power >= minUnits) return multiple * power;
  }
  return 10 * power;
}

/** Tick label without floating-point noise (0.30000000000000004 → "0.3"). */
export function formatTick(value: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const rounded = Number(value.toFixed(Math.min(decimals, 12)));
  if (rounded === 0) return "0";
  const abs = Math.abs(rounded);
  return abs >= 1e6 || abs < 1e-4 ? rounded.toExponential() : String(rounded);
}
