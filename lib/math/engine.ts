import { all, create, type MathJsInstance } from "mathjs";

export type AngleMode = "rad" | "deg";

type Engine = {
  math: MathJsInstance;
  parse: MathJsInstance["parse"];
};

const disabled = (name: string) => () => {
  throw new Error(`Function ${name} is disabled`);
};

/** Results smaller than this from trig functions of non-tiny inputs are rounding noise (sin(pi)). */
const TRIG_NOISE = 1e-15;
const DEG = Math.PI / 180;

const snapNoise = (result: number, input: number) =>
  Math.abs(result) < TRIG_NOISE && Math.abs(input) > 1e-6 ? 0 : result;

/** True when `degrees` is an exact multiple of `step` plus `offset`. */
const isMultiple = (degrees: number, step: number, offset = 0) => Number.isInteger((degrees - offset) / step);

/**
 * Trig functions for the given angle mode. In degree mode, real-number inputs
 * to sin/cos/tan are read as degrees and inverse functions return degrees.
 * Non-number inputs (units such as `30 deg`, complex numbers) go to Math.js
 * unchanged. Exact zeros (sin 180°, cos 90°, sin π) are returned as 0 rather
 * than floating-point noise, and tan at an odd multiple of 90° is an error.
 */
function trigFunctions(math: MathJsInstance, mode: AngleMode) {
  const { sin, cos, tan, asin, acos, atan, atan2, asec, acsc, acot } = math;
  const isDeg = mode === "deg";
  const toRad = (x: number) => (isDeg ? x * DEG : x);
  const fromRad = (value: unknown) => (isDeg && typeof value === "number" ? value / DEG : value);

  const wrappedSin = (x: unknown) => {
    if (typeof x !== "number") return sin(x as number);
    if (isDeg && isMultiple(x, 180)) return 0;
    return snapNoise(Math.sin(toRad(x)), x);
  };
  const wrappedCos = (x: unknown) => {
    if (typeof x !== "number") return cos(x as number);
    if (isDeg && isMultiple(x, 180, 90)) return 0;
    return snapNoise(Math.cos(toRad(x)), x);
  };
  const wrappedTan = (x: unknown) => {
    if (typeof x !== "number") return tan(x as number);
    if (isDeg && isMultiple(x, 180)) return 0;
    if (isDeg && isMultiple(x, 180, 90)) throw new Error(`tan is undefined at ${x}°`);
    return snapNoise(Math.tan(toRad(x)), x);
  };

  return {
    sin: wrappedSin,
    cos: wrappedCos,
    tan: wrappedTan,
    sec: (x: unknown) => 1 / (wrappedCos(x) as number),
    csc: (x: unknown) => 1 / (wrappedSin(x) as number),
    cot: (x: unknown) => 1 / (wrappedTan(x) as number),
    asin: (x: unknown) => fromRad(asin(x as number)),
    acos: (x: unknown) => fromRad(acos(x as number)),
    atan: (x: unknown) => fromRad(atan(x as number)),
    atan2: (y: unknown, x: unknown) => fromRad(atan2(y as number, x as number)),
    asec: (x: unknown) => fromRad(asec(x as number)),
    acsc: (x: unknown) => fromRad(acsc(x as number)),
    acot: (x: unknown) => fromRad(acot(x as number)),
  };
}

/**
 * Builds a sandboxed Math.js instance. Expressions come from user input, so
 * functions that could redefine the instance or re-enter the parser are
 * disabled for expressions (per the Math.js security guide). The parser is
 * captured before it is overridden.
 */
function buildEngine(mode: AngleMode): Engine {
  const math = create(all, { number: "number", precision: 64 });
  const parse = math.parse;
  math.import(
    {
      ...trigFunctions(math, mode),
      import: disabled("import"),
      createUnit: disabled("createUnit"),
      evaluate: disabled("evaluate"),
      parse: disabled("parse"),
      simplify: disabled("simplify"),
      derivative: disabled("derivative"),
      resolve: disabled("resolve"),
      reviver: disabled("reviver"),
    },
    { override: true },
  );
  return { math, parse };
}

const engines: Partial<Record<AngleMode, Engine>> = {};
const getEngine = (mode: AngleMode): Engine => (engines[mode] ??= buildEngine(mode));

const parse = (source: string) => getEngine("rad").parse(source);
const format = (value: unknown, options: { precision: number }) => getEngine("rad").math.format(value, options);

/** Variables and functions the user defines, plus `ans`. */
export type Scope = Map<string, unknown>;

export function createScope(): Scope {
  return new Map<string, unknown>([["ans", 0]]);
}

export type EvalResult =
  | { ok: true; value: unknown; display: string; tex: string }
  | { ok: false; error: string };

const DISPLAY_PRECISION = 12;

export function formatValue(value: unknown): string {
  if (typeof value === "function") {
    const fn = value as { syntax?: string };
    return fn.syntax ?? "function";
  }
  return format(value, { precision: DISPLAY_PRECISION });
}

/**
 * Evaluates an expression against the given scope, reading trig angles in
 * `angleMode`. Assignments (`a = 3`, `f(x) = x^2`) are stored in the scope.
 * A successful non-function result is also stored as `ans`.
 */
export function evaluateExpression(expr: string, scope: Scope, angleMode: AngleMode = "rad"): EvalResult {
  const source = expr.trim();
  if (!source) return { ok: false, error: "Enter an expression" };

  try {
    const node = getEngine(angleMode).parse(source);
    let value = node.compile().evaluate(scope);
    // Multiple statements (`r = 2; pi r^2`) return a ResultSet; show the last
    // visible result. A trailing `;` hides a statement's result.
    if (isResultSet(value)) value = value.entries.at(-1);
    if (value === undefined) return { ok: false, error: "No result" };
    if (typeof value !== "function") scope.set("ans", value);
    return { ok: true, value, display: formatValue(value), tex: resultToTex(value) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export type PlotFunction = (x: number) => number;

export type CompileResult =
  | { ok: true; fn: PlotFunction; tex: string }
  | { ok: false; error: string };

/**
 * Compiles the right-hand side of `y = f(x)` into a fast numeric function.
 * A leading `y =` is optional. Symbols other than `x` must be built-in
 * (`sin`, `pi`, ...) or defined in `scope`. The returned function yields NaN
 * wherever the expression is undefined or not a real number.
 */
export function compileFunction(expr: string, scope: Scope, angleMode: AngleMode = "rad"): CompileResult {
  const source = expr.trim().replace(/^y\s*=(?!=)/, "").trim();
  if (!source) return { ok: false, error: "Enter a function of x" };

  try {
    const { math, parse } = getEngine(angleMode);
    const node = parse(source);
    if (node.type === "AssignmentNode" || node.type === "FunctionAssignmentNode") {
      return { ok: false, error: "Enter an expression in x, such as x^2 - 1" };
    }

    const unknown = new Set<string>();
    node.traverse((child) => {
      if (child.type !== "SymbolNode") return;
      const name = (child as unknown as { name: string }).name;
      if (name !== "x" && !scope.has(name) && !(name in math)) unknown.add(name);
    });
    if (unknown.size > 0) {
      return { ok: false, error: `Undefined symbol${unknown.size > 1 ? "s" : ""}: ${[...unknown].join(", ")}` };
    }

    const compiled = node.compile();
    const local = new Map(scope);
    const fn: PlotFunction = (x) => {
      local.set("x", x);
      try {
        const value = compiled.evaluate(local);
        if (typeof value === "number") return value;
        if (typeof value === "boolean") return Number(value);
        return NaN;
      } catch {
        return NaN;
      }
    };

    return { ok: true, fn, tex: `y = ${node.toTex({ parenthesis: "keep", implicit: "hide" })}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function isResultSet(value: unknown): value is { entries: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { isResultSet?: boolean }).isResultSet === true
  );
}

/** Converts an expression to TeX, or returns null if it does not parse yet. */
export function expressionToTex(expr: string): string | null {
  const source = expr.trim();
  if (!source) return null;
  try {
    return parse(source).toTex({ parenthesis: "keep", implicit: "hide" });
  } catch {
    return null;
  }
}

function resultToTex(value: unknown): string {
  if (typeof value === "function") return `\\text{${formatValue(value)}}`;
  try {
    return parse(formatValue(value)).toTex();
  } catch {
    return `\\text{${formatValue(value)}}`;
  }
}
