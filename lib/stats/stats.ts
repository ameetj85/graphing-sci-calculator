/** Data lists, one-variable statistics and regression models. */

export type ParsedList = { values: number[]; invalid: string[] };

/** Reads numbers separated by commas, spaces, semicolons or new lines. */
export function parseList(text: string): ParsedList {
  const values: number[] = [];
  const invalid: string[] = [];
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    const value = Number(token);
    if (Number.isFinite(value)) values.push(value);
    else invalid.push(token);
  }
  return { values, invalid };
}

export type Summary = {
  n: number;
  sum: number;
  mean: number;
  /** Sample standard deviation (n − 1), "Sx" on a TI-84. */
  sampleSD: number;
  /** Population standard deviation (n), "σx" on a TI-84. */
  populationSD: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
};

function medianOfSorted(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * One-variable statistics. Quartiles use the TI-84 method: the medians of the
 * lower and upper halves, excluding the overall median when n is odd.
 */
export function summarize(values: number[]): Summary | null {
  const n = values.length;
  if (n === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const squares = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  const half = Math.floor(n / 2);
  const lower = sorted.slice(0, half);
  const upper = sorted.slice(n % 2 ? half + 1 : half);
  return {
    n,
    sum,
    mean,
    sampleSD: n > 1 ? Math.sqrt(squares / (n - 1)) : NaN,
    populationSD: Math.sqrt(squares / n),
    min: sorted[0],
    q1: lower.length ? medianOfSorted(lower) : sorted[0],
    median: medianOfSorted(sorted),
    q3: upper.length ? medianOfSorted(upper) : sorted[n - 1],
    max: sorted[n - 1],
  };
}

export type RegressionModel = "linear" | "quadratic" | "exponential" | "power" | "logarithmic";

export const REGRESSION_MODELS: { value: RegressionModel; label: string; form: string }[] = [
  { value: "linear", label: "Linear", form: "y = ax + b" },
  { value: "quadratic", label: "Quadratic", form: "y = ax² + bx + c" },
  { value: "exponential", label: "Exponential", form: "y = a·bˣ" },
  { value: "power", label: "Power", form: "y = a·xᵇ" },
  { value: "logarithmic", label: "Logarithmic", form: "y = a + b·ln x" },
];

export type Fit = {
  model: RegressionModel;
  coefficients: { name: string; value: number }[];
  /** Coefficient of determination, computed on the original y values. */
  r2: number;
  /** Math.js expression in x, ready to graph, e.g. "1.5*x + 0.3". */
  expression: string;
  predict: (x: number) => number;
};

export type FitResult = { ok: true; fit: Fit } | { ok: false; error: string };

/** Least-squares line through (xs, ys): returns [slope, intercept]. */
function linearLeastSquares(xs: number[], ys: number[]): [number, number] | null {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  return [slope, my - slope * mx];
}

/** Solves a small linear system by Gaussian elimination with partial pivoting. */
function solve(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = a[r][col] / a[col][col];
      for (let c = col; c <= n; c++) a[r][c] -= factor * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

/** Six significant digits, without floating-point noise. */
export function formatCoefficient(value: number): string {
  if (Math.abs(value) < 1e-12) return "0";
  return String(Number(value.toPrecision(6)));
}

/** Joins terms like ["1.5*x", "-0.3"] into "1.5*x - 0.3". */
function joinTerms(terms: string[]): string {
  return terms
    .map((term, i) => (i === 0 ? term : term.startsWith("-") ? `- ${term.slice(1)}` : `+ ${term}`))
    .join(" ");
}

function rSquared(xs: number[], ys: number[], predict: (x: number) => number): number {
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < xs.length; i++) {
    ssRes += (ys[i] - predict(xs[i])) ** 2;
    ssTot += (ys[i] - mean) ** 2;
  }
  return ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot;
}

export function fitRegression(xs: number[], ys: number[], model: RegressionModel): FitResult {
  if (xs.length !== ys.length) return { ok: false, error: `L1 has ${xs.length} values but L2 has ${ys.length}` };
  const minPoints = model === "quadratic" ? 3 : 2;
  if (xs.length < minPoints) return { ok: false, error: `Need at least ${minPoints} (x, y) pairs` };

  const fail = (error: string): FitResult => ({ ok: false, error });
  const f = formatCoefficient;
  let coefficients: { name: string; value: number }[];
  let expression: string;
  let predict: (x: number) => number;

  switch (model) {
    case "linear": {
      const line = linearLeastSquares(xs, ys);
      if (!line) return fail("All x values are the same");
      const [a, b] = line;
      coefficients = [{ name: "a", value: a }, { name: "b", value: b }];
      expression = joinTerms([`${f(a)}*x`, f(b)]);
      predict = (x) => a * x + b;
      break;
    }
    case "quadratic": {
      const s = (p: number) => xs.reduce((acc, x) => acc + x ** p, 0);
      const t = (p: number) => xs.reduce((acc, x, i) => acc + x ** p * ys[i], 0);
      const solution = solve(
        [
          [s(4), s(3), s(2)],
          [s(3), s(2), s(1)],
          [s(2), s(1), xs.length],
        ],
        [t(2), t(1), t(0)],
      );
      if (!solution) return fail("Need at least 3 different x values");
      const [a, b, c] = solution;
      coefficients = [{ name: "a", value: a }, { name: "b", value: b }, { name: "c", value: c }];
      expression = joinTerms([`${f(a)}*x^2`, `${f(b)}*x`, f(c)]);
      predict = (x) => a * x * x + b * x + c;
      break;
    }
    case "exponential": {
      if (ys.some((y) => y <= 0)) return fail("Exponential fits need every y > 0");
      const line = linearLeastSquares(xs, ys.map(Math.log));
      if (!line) return fail("All x values are the same");
      const [a, b] = [Math.exp(line[1]), Math.exp(line[0])];
      coefficients = [{ name: "a", value: a }, { name: "b", value: b }];
      expression = `${f(a)}*${f(b)}^x`;
      predict = (x) => a * b ** x;
      break;
    }
    case "power": {
      if (xs.some((x) => x <= 0) || ys.some((y) => y <= 0)) return fail("Power fits need every x > 0 and y > 0");
      const line = linearLeastSquares(xs.map(Math.log), ys.map(Math.log));
      if (!line) return fail("All x values are the same");
      const [a, b] = [Math.exp(line[1]), line[0]];
      coefficients = [{ name: "a", value: a }, { name: "b", value: b }];
      expression = `${f(a)}*x^${b < 0 ? `(${f(b)})` : f(b)}`;
      predict = (x) => a * x ** b;
      break;
    }
    case "logarithmic": {
      if (xs.some((x) => x <= 0)) return fail("Logarithmic fits need every x > 0");
      const line = linearLeastSquares(xs.map(Math.log), ys);
      if (!line) return fail("All x values are the same");
      const [a, b] = [line[1], line[0]];
      coefficients = [{ name: "a", value: a }, { name: "b", value: b }];
      expression = joinTerms([f(a), `${f(b)}*log(x)`]);
      predict = (x) => a + b * Math.log(x);
      break;
    }
  }

  return { ok: true, fit: { model, coefficients, r2: rSquared(xs, ys, predict), expression, predict } };
}
