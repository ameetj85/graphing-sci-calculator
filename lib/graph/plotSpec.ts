/**
 * Turns the text of an equation row into something drawable. The kind of
 * graph is inferred from the syntax, so a single input handles everything:
 *
 *   x^2, y = x^2          function of x
 *   y > x^2, x^2 <= y     shaded inequality
 *   r = 2 sin(3 theta)    polar curve (theta, θ or t)
 *   (cos(t), sin(t))      parametric curve
 *   x^2 + y^2 = 4         implicit curve (traced in the plotting worker)
 *   z = sin(x) cos(y)     3D surface (shown in the 3D view)
 *
 * Polar and parametric curves may end with a range such as {0 <= t <= 4pi};
 * otherwise t (or θ) runs over one full turn in the current angle mode.
 */
import {
  HALF_TURN,
  compileFunction,
  compileIn,
  compileInVariables,
  evaluateExpression,
  isBuiltInName,
  type AngleMode,
  type Scope,
} from "@/lib/math/engine";
import { toExactForm } from "@/lib/math/exact";
import { formatCoordinate } from "./keyPoints";
import type { Point } from "./sample";

export type Comparison = "<" | "<=" | ">" | ">=";

export type PlotSpec =
  /** y = f(x). `source` is f, for sampling in the plotting worker. */
  | { kind: "function"; fn: (x: number) => number; source: string; tex: string }
  | { kind: "inequality"; fn: (x: number) => number; op: Comparison; tex: string }
  | {
      kind: "parametric" | "polar";
      xy: (t: number) => Point;
      tMin: number;
      tMax: number;
      tex: string;
      /** e.g. "θ from 0 to 2π" */
      rangeLabel: string;
    }
  /** F(x, y) = 0, traced off the main thread. `source` is F. */
  | { kind: "implicit"; source: string; tex: string }
  /** z = f(x, y). `source` is f. */
  | { kind: "surface"; source: string; tex: string };

export type PlotResult = { ok: true; spec: PlotSpec } | { ok: false; error: string };

const RANGE_SUFFIX = /\{\s*([^{}]+?)\s*(<=|≤|<)\s*(t|theta|θ)\s*(<=|≤|<)\s*([^{}]+?)\s*\}\s*$/;
const POLAR = /^r\s*=(?!=)\s*([\s\S]*)$/;
const Y_FIRST = /^y\s*(<=|>=|≤|≥|<|>)(?!=)\s*([\s\S]+)$/;
const Y_LAST = /^([\s\S]+?)\s*(<=|>=|≤|≥|<|>)\s*y$/;

const normalizeOp = (op: string): Comparison => (op === "≤" ? "<=" : op === "≥" ? ">=" : (op as Comparison));
const flipOp = (op: Comparison): Comparison => ({ "<": ">", "<=": ">=", ">": "<", ">=": "<=" })[op] as Comparison;
const OP_TEX: Record<Comparison, string> = { "<": "<", "<=": "\\le", ">": ">", ">=": "\\ge" };


/** Splits on commas that are not inside parentheses or brackets. */
export function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      parts.push(source.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(source.slice(start));
  return parts.map((p) => p.trim());
}

/**
 * Splits an equation at its single top-level "=" (not part of ==, <=, >= or
 * !=, and not inside brackets). Returns null if there isn't exactly one.
 */
export function splitEquation(source: string): [string, string] | null {
  let depth = 0;
  let at = -1;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "=" && depth === 0) {
      const before = source[i - 1];
      const after = source[i + 1];
      if (after === "=" || before === "=" || before === "<" || before === ">" || before === "!") continue;
      if (at !== -1) return null;
      at = i;
    }
  }
  if (at === -1) return null;
  return [source.slice(0, at).trim(), source.slice(at + 1).trim()];
}

const FUNCTION_DEFINITION = /^([A-Za-z_]\w*)\s*\([^()]*\)$/;

/** If the whole text is wrapped in one pair of parentheses, returns the inside. */
function unwrapParens(source: string): string | null {
  if (!source.startsWith("(") || !source.endsWith(")")) return null;
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "(") depth++;
    else if (source[i] === ")") depth--;
    if (depth === 0 && i < source.length - 1) return null; // e.g. (x+1)*(x-1)
  }
  return source.slice(1, -1);
}

function formatBound(value: number, angleMode: AngleMode): string {
  if (angleMode !== "rad" || Number.isInteger(value)) return formatCoordinate(value);
  return toExactForm(value)?.text ?? formatCoordinate(value);
}

function evaluateBound(text: string, scope: Scope, angleMode: AngleMode): number | null {
  const result = evaluateExpression(text, new Map(scope), angleMode);
  return result.ok && typeof result.value === "number" && Number.isFinite(result.value) ? result.value : null;
}

function polarVariable(source: string): string {
  if (source.includes("θ")) return "θ";
  if (/\btheta\b/.test(source)) return "theta";
  if (/\bt\b/.test(source)) return "t";
  return "theta";
}

export function compilePlot(text: string, scope: Scope, angleMode: AngleMode): PlotResult {
  let body = text.trim();
  if (!body) return { ok: false, error: "Enter an equation" };

  // Optional {a <= t <= b} range for polar and parametric curves.
  let range: { min: number; max: number } | null = null;
  const rangeMatch = body.match(RANGE_SUFFIX);
  if (rangeMatch) {
    const min = evaluateBound(rangeMatch[1], scope, angleMode);
    const max = evaluateBound(rangeMatch[5], scope, angleMode);
    if (min === null || max === null || !(max > min)) {
      return { ok: false, error: "The range needs two numbers with the first smaller, e.g. {0 <= t <= 2pi}" };
    }
    range = { min, max };
    body = body.slice(0, rangeMatch.index).trim();
  }
  const fullTurn = 2 * HALF_TURN[angleMode];
  const tMin = range?.min ?? 0;
  const tMax = range?.max ?? fullTurn;
  const toRadians = (angle: number) => (angle * Math.PI) / HALF_TURN[angleMode];

  const polar = body.match(POLAR);
  if (polar) {
    const variable = polarVariable(polar[1]);
    const r = compileIn(polar[1], variable, scope, angleMode);
    if (!r.ok) return r;
    const symbol = variable === "t" ? "t" : "θ";
    return {
      ok: true,
      spec: {
        kind: "polar",
        xy: (theta) => {
          const radius = r.fn(theta);
          const a = toRadians(theta);
          return [radius * Math.cos(a), radius * Math.sin(a)];
        },
        tMin,
        tMax,
        tex: `r = ${r.tex}`,
        rangeLabel: `${symbol} from ${formatBound(tMin, angleMode)} to ${formatBound(tMax, angleMode)}`,
      },
    };
  }

  const inner = unwrapParens(body);
  if (inner !== null) {
    const parts = splitTopLevel(inner);
    if (parts.length === 2) {
      const x = compileIn(parts[0], "t", scope, angleMode);
      if (!x.ok) return x;
      const y = compileIn(parts[1], "t", scope, angleMode);
      if (!y.ok) return y;
      return {
        ok: true,
        spec: {
          kind: "parametric",
          xy: (t) => [x.fn(t), y.fn(t)],
          tMin,
          tMax,
          tex: `\\left(${x.tex},\\ ${y.tex}\\right)`,
          rangeLabel: `t from ${formatBound(tMin, angleMode)} to ${formatBound(tMax, angleMode)}`,
        },
      };
    }
    if (parts.length > 2) return { ok: false, error: "A parametric curve has two parts: (x(t), y(t))" };
  }

  if (range) return { ok: false, error: "A {…} range applies to polar r = … and parametric (x(t), y(t)) curves" };

  const equation = splitEquation(body);
  if (equation) {
    const [lhs, rhs] = equation;
    if (!lhs || !rhs) return { ok: false, error: "Write an expression on both sides of =" };
    if (lhs === "z") {
      const f = compileInVariables(rhs, ["x", "y"], scope, angleMode);
      if (!f.ok) return f;
      return { ok: true, spec: { kind: "surface", source: rhs, tex: `z = ${f.tex}` } };
    }
    const definition = lhs.match(FUNCTION_DEFINITION);
    if (definition && !scope.has(definition[1]) && !isBuiltInName(definition[1])) {
      return {
        ok: false,
        error: `Define ${definition[1]} in the Expression input, then graph it here as ${definition[1]}(x)`,
      };
    }
    // y = f(x) stays an ordinary function (traceable, tabulated).
    if (!(lhs === "y" && !/\by\b/.test(rhs))) {
      const left = compileInVariables(lhs, ["x", "y"], scope, angleMode);
      if (!left.ok) return left;
      const right = compileInVariables(rhs, ["x", "y"], scope, angleMode);
      if (!right.ok) return right;
      return { ok: true, spec: { kind: "implicit", source: `(${lhs}) - (${rhs})`, tex: `${left.tex} = ${right.tex}` } };
    }
  }

  const yFirst = body.match(Y_FIRST);
  const yLast = yFirst ? null : body.match(Y_LAST);
  if (yFirst || yLast) {
    const op = yFirst ? normalizeOp(yFirst[1]) : flipOp(normalizeOp(yLast![2]));
    const expr = yFirst ? yFirst[2] : yLast![1];
    const f = compileIn(expr, "x", scope, angleMode);
    if (!f.ok) return f;
    return { ok: true, spec: { kind: "inequality", fn: f.fn, op, tex: `y ${OP_TEX[op]} ${f.tex}` } };
  }

  const f = compileFunction(body, scope, angleMode);
  if (!f.ok) return f;
  const source = body.replace(/^y\s*=(?!=)/, "").trim();
  return { ok: true, spec: { kind: "function", fn: f.fn, source, tex: f.tex } };
}
