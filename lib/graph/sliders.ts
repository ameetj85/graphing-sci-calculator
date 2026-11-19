/**
 * Sliders for the free variables of the graphed equations: `a` and `b` in
 * y = a sin(b x). A variable gets a slider when an equation mentions it and
 * the calculator scope holds a number for it. Names that aren't defined at
 * all are listed separately so the graph card can offer to create them.
 */
import type { Scope } from "@/lib/math/engine";
import { WORKSPACE_VARIABLES } from "@/lib/calculator/workspace";

export type SliderRange = { min: number; max: number; step: number };

/** Names that are graph coordinates or parameters, never sliders. */
const GRAPH_VARIABLES = new Set(["x", "y", "z", "r", "t", "theta", "ans"]);

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g;
const SLOPE_FIELD_PREFIX = /^\s*dy\s*\/\s*dx\s*=/;

/**
 * Identifiers in the equation texts in order of first appearance, skipping
 * function calls (`sin(`) and exponents in numbers (`2e3`).
 */
export function equationIdentifiers(texts: string[]): { name: string; called: boolean }[] {
  const seen = new Map<string, { name: string; called: boolean }>();
  for (const fullText of texts) {
    // The dy/dx of a slope field is notation, not two variables.
    const text = fullText.replace(SLOPE_FIELD_PREFIX, (prefix) => " ".repeat(prefix.length));
    for (const match of text.matchAll(IDENTIFIER)) {
      const name = match[0];
      const start = match.index;
      const before = text[start - 1] ?? "";
      if (/[0-9.]/.test(before) && /^[eE][0-9]*$/.test(name)) continue;
      const called = /^\s*\(/.test(text.slice(start + name.length));
      const entry = seen.get(name);
      if (entry) entry.called &&= called;
      else seen.set(name, { name, called });
    }
  }
  return [...seen.values()];
}

/**
 * The variables to show sliders for, and the undefined names that could get
 * one. `isBuiltIn` tells built-in names (sin, pi, e) apart from user ones.
 */
export function sliderVariables(
  texts: string[],
  scope: Scope,
  isBuiltIn: (name: string) => boolean,
): { sliders: string[]; missing: string[] } {
  const sliders: string[] = [];
  const missing: string[] = [];
  for (const { name, called } of equationIdentifiers(texts)) {
    if (GRAPH_VARIABLES.has(name) || WORKSPACE_VARIABLES.includes(name)) continue;
    if (scope.has(name)) {
      const value = scope.get(name);
      if (typeof value === "number" && Number.isFinite(value)) sliders.push(name);
    } else if (!called && !isBuiltIn(name)) {
      missing.push(name);
    }
  }
  return { sliders, missing };
}

/** -10 to 10 in steps of 0.1, or a wider power-of-ten range for larger values. */
export function defaultRange(value: number): SliderRange {
  if (Math.abs(value) <= 10) return { min: -10, max: 10, step: 0.1 };
  const span = 10 ** Math.ceil(Math.log10(Math.abs(value)));
  return { min: -span, max: span, step: span / 100 };
}

/** The range widened to include `value` (set from the calculator, for example). */
export function rangeIncluding(range: SliderRange, value: number): SliderRange {
  return { ...range, min: Math.min(range.min, value), max: Math.max(range.max, value) };
}

/** A sensible step for a range: a power of ten giving 100 to 1000 positions. */
export function stepFor(min: number, max: number): number {
  const span = max - min;
  if (!(span > 0)) return 0.1;
  return 10 ** Math.floor(Math.log10(span / 100));
}

/** Rounds `value` to the slider's step, without floating-point noise (0.30000000000000004). */
export function snapToStep(value: number, range: SliderRange): number {
  const snapped = range.min + Math.round((value - range.min) / range.step) * range.step;
  const decimals = Math.max(0, -Math.floor(Math.log10(range.step)));
  return Number(Math.min(range.max, Math.max(range.min, snapped)).toFixed(Math.min(decimals, 15)));
}
