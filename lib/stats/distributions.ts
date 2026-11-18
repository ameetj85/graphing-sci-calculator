/**
 * Probability distribution functions with calculator-style names, made
 * available inside expressions (see the engine). Arguments follow the
 * TI-84 order, e.g. binompdf(n, p, k) and normalcdf(lower, upper, μ, σ).
 */
import { erf, lgamma } from "mathjs";

const SQRT_2PI = Math.sqrt(2 * Math.PI);

function requirePositive(value: number, name: string) {
  if (!(value > 0)) throw new Error(`${name} must be greater than 0`);
}

function requireProbability(value: number, name = "p") {
  if (!(value >= 0 && value <= 1)) throw new Error(`${name} must be between 0 and 1`);
}

function requireCount(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a whole number ≥ 0`);
}

/** Standard normal CDF. */
function phi(z: number): number {
  if (z === Infinity) return 1;
  if (z === -Infinity) return 0;
  return 0.5 * (1 + (erf(z / Math.SQRT2) as number));
}

export function normalpdf(x: number, mu = 0, sigma = 1): number {
  requirePositive(sigma, "σ");
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * SQRT_2PI);
}

/** P(lower ≤ X ≤ upper) for X ~ N(μ, σ). Use ±Infinity (or ±1e99) for open ends. */
export function normalcdf(lower: number, upper: number, mu = 0, sigma = 1): number {
  requirePositive(sigma, "σ");
  return phi((upper - mu) / sigma) - phi((lower - mu) / sigma);
}

/** x such that P(X ≤ x) = p for X ~ N(μ, σ). */
export function invNorm(p: number, mu = 0, sigma = 1): number {
  requirePositive(sigma, "σ");
  if (!(p > 0 && p < 1)) throw new Error("p must be strictly between 0 and 1");
  let z = acklam(p);
  // Two Newton steps polish the approximation to full double precision.
  for (let i = 0; i < 2; i++) z -= (phi(z) - p) / normalpdf(z);
  return mu + sigma * z;
}

/** Peter Acklam's rational approximation to the inverse normal CDF (|error| < 1.2e-9). */
function acklam(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - low) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

const lnFactorial = (n: number) => lgamma(n + 1) as number;

/** P(X = k) for X ~ Binomial(n, p). */
export function binompdf(n: number, p: number, k: number): number {
  requireCount(n, "n");
  requireProbability(p);
  if (!Number.isInteger(k) || k < 0 || k > n) return 0;
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  const lnChoose = lnFactorial(n) - lnFactorial(k) - lnFactorial(n - k);
  return Math.exp(lnChoose + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** P(X ≤ k) for X ~ Binomial(n, p). */
export function binomcdf(n: number, p: number, k: number): number {
  requireCount(n, "n");
  requireProbability(p);
  if (k < 0) return 0;
  let total = 0;
  for (let i = 0; i <= Math.min(Math.floor(k), n); i++) total += binompdf(n, p, i);
  return Math.min(total, 1);
}

/** P(X = k) for X ~ Poisson(λ). */
export function poissonpdf(lambda: number, k: number): number {
  requirePositive(lambda, "λ");
  if (!Number.isInteger(k) || k < 0) return 0;
  return Math.exp(-lambda + k * Math.log(lambda) - lnFactorial(k));
}

/** P(X ≤ k) for X ~ Poisson(λ). */
export function poissoncdf(lambda: number, k: number): number {
  requirePositive(lambda, "λ");
  if (k < 0) return 0;
  let total = 0;
  for (let i = 0; i <= Math.floor(k); i++) total += poissonpdf(lambda, i);
  return Math.min(total, 1);
}

export const DISTRIBUTIONS = { normalpdf, normalcdf, invNorm, binompdf, binomcdf, poissonpdf, poissoncdf };
