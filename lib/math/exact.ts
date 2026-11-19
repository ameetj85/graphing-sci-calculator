/**
 * Recognizes exact forms of decimal results, the way scientific calculators
 * show 0.7071… as √2/2: simple fractions, rational multiples of square roots,
 * and rational multiples of π. Returns null when no simple form matches, in
 * which case the decimal is shown.
 */
export type ExactForm = { text: string; tex: string };

/** Relative tolerance for accepting a match (results carry ~15–16 digits). */
const TOLERANCE = 1e-12;
const MAX_MAGNITUDE = 1e12;

/** Best rational approximation p/q with q ≤ maxDen that matches v within tolerance. */
export function toFraction(v: number, maxDen: number): [number, number] | null {
  if (!Number.isFinite(v)) return null;
  const sign = v < 0 ? -1 : 1;
  const target = Math.abs(v);
  let [h0, h1] = [0, 1];
  let [k0, k1] = [1, 0];
  let x = target;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(x);
    const h2 = a * h1 + h0;
    const k2 = a * k1 + k0;
    if (k2 > maxDen) break;
    [h0, h1] = [h1, h2];
    [k0, k1] = [k1, k2];
    if (Math.abs(target - h1 / k1) <= TOLERANCE * Math.max(1, target)) return [sign * h1, k1];
    const frac = x - a;
    if (frac < 1e-15) break;
    x = 1 / frac;
  }
  return null;
}

function isSquareFree(n: number): boolean {
  for (let f = 2; f * f <= n; f++) if (n % (f * f) === 0) return false;
  return true;
}

const SQUARE_FREE = Array.from({ length: 98 }, (_, i) => i + 2).filter(isSquareFree);

/** Joins a coefficient p/q with a symbol (√n or π) as text and TeX. */
function formWithSymbol(p: number, q: number, symbolText: string, symbolTex: string): ExactForm {
  const sign = p < 0 ? "-" : "";
  const num = Math.abs(p);
  const coefText = num === 1 ? "" : String(num);
  const text = `${sign}${coefText}${symbolText}${q === 1 ? "" : `/${q}`}`;
  const numerTex = `${num === 1 ? "" : num}${symbolTex}`;
  const tex = q === 1 ? `${sign}${numerTex}` : `${sign}\\frac{${numerTex}}{${q}}`;
  return { text, tex };
}

export function toExactForm(value: unknown): ExactForm | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (Number.isInteger(value) || Math.abs(value) > MAX_MAGNITUDE || Math.abs(value) < 1e-9) return null;
  // Rounding noise next to a whole number (tan(pi/4) = 0.9999999999999999)
  // is shown as the decimal, which already displays as the whole number.
  if (Math.abs(value - Math.round(value)) <= TOLERANCE * Math.abs(value)) return null;

  const fraction = toFraction(value, 10000);
  if (fraction) {
    const [p, q] = fraction;
    const sign = p < 0 ? "-" : "";
    return { text: `${p}/${q}`, tex: `${sign}\\frac{${Math.abs(p)}}{${q}}` };
  }

  for (const n of SQUARE_FREE) {
    const coefficient = toFraction(value / Math.sqrt(n), 100);
    if (coefficient && Math.abs(coefficient[0]) <= 1000) {
      return formWithSymbol(coefficient[0], coefficient[1], `√${n}`, `\\sqrt{${n}}`);
    }
  }

  const piCoefficient = toFraction(value / Math.PI, 24);
  if (piCoefficient && Math.abs(piCoefficient[0]) <= 1000) {
    return formWithSymbol(piCoefficient[0], piCoefficient[1], "π", "\\pi");
  }

  return null;
}
