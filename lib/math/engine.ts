import { all, create, type MathJsInstance } from "mathjs";
import { DISTRIBUTIONS } from "@/lib/stats/distributions";

export type AngleMode = "rad" | "deg" | "grad";

/** Size of a half turn in each angle unit. */
export const HALF_TURN: Record<AngleMode, number> = { rad: Math.PI, deg: 180, grad: 200 };
const ANGLE_SYMBOL: Record<AngleMode, string> = { rad: " rad", deg: "°", grad: " grad" };

type Engine = {
  math: MathJsInstance;
  parse: MathJsInstance["parse"];
};

const disabled = (name: string) => () => {
  throw new Error(`Function ${name} is disabled`);
};

/** Results smaller than this from trig functions of non-tiny inputs are rounding noise (sin(pi)). */
const TRIG_NOISE = 1e-15;

const snapNoise = (result: number, input: number) =>
  Math.abs(result) < TRIG_NOISE && Math.abs(input) > 1e-6 ? 0 : result;

/** True when `angle` is an exact multiple of `step` plus `offset`. */
const isMultiple = (angle: number, step: number, offset = 0) => Number.isInteger((angle - offset) / step);

/**
 * Trig functions for the given angle mode. In degree and gradian modes,
 * real-number inputs to sin/cos/tan are read in that unit and inverse
 * functions return it. Non-number inputs (units such as `30 deg`, complex
 * numbers) go to Math.js unchanged. Exact zeros (sin 180°, cos 100 grad,
 * sin π) are returned as 0 rather than floating-point noise, and tan at an
 * odd multiple of a quarter turn is an error.
 */
function trigFunctions(math: MathJsInstance, mode: AngleMode) {
  const { sin, cos, tan, asin, acos, atan, atan2, asec, acsc, acot } = math;
  const half = HALF_TURN[mode];
  const exact = mode !== "rad"; // multiples of a quarter turn are exact numbers
  const toRad = (x: number) => (x * Math.PI) / half;
  const fromRad = (value: unknown) => (exact && typeof value === "number" ? (value * half) / Math.PI : value);

  const wrappedSin = (x: unknown) => {
    if (typeof x !== "number") return sin(x as number);
    if (exact && isMultiple(x, half)) return 0;
    return snapNoise(Math.sin(toRad(x)), x);
  };
  const wrappedCos = (x: unknown) => {
    if (typeof x !== "number") return cos(x as number);
    if (exact && isMultiple(x, half, half / 2)) return 0;
    return snapNoise(Math.cos(toRad(x)), x);
  };
  const wrappedTan = (x: unknown) => {
    if (typeof x !== "number") return tan(x as number);
    if (exact && isMultiple(x, half)) return 0;
    if (exact && isMultiple(x, half, half / 2)) throw new Error(`tan is undefined at ${x}${ANGLE_SYMBOL[mode]}`);
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
  // Common units Math.js lacks; createUnit is disabled for expressions below.
  math.createUnit({
    cal: { definition: "4.184 J", prefixes: "short" },
    knot: { definition: "1852 m/hour", aliases: ["knots"] },
    nmi: { definition: "1852 m", aliases: ["nauticalMile"] },
  });
  math.import(
    {
      ...trigFunctions(math, mode),
      ...DISTRIBUTIONS,
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
    recordDefinitions(node, scope, angleMode);
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
  const result = compileIn(source, "x", scope, angleMode);
  return result.ok ? { ...result, tex: `y = ${result.tex}` } : result;
}

/**
 * Compiles an expression in one variable (`x`, `t`, `theta`, ...) into a
 * numeric function, with the same rules as compileFunction. The TeX is the
 * expression alone.
 */
export function compileIn(source: string, variable: string, scope: Scope, angleMode: AngleMode = "rad"): CompileResult {
  const result = compileInVariables(source, [variable], scope, angleMode);
  if (!result.ok) return result;
  const { fn, tex } = result;
  return { ok: true, fn: (value) => fn(value), tex };
}

export type MultiFunction = (...values: number[]) => number;

export type MultiCompileResult = { ok: true; fn: MultiFunction; tex: string } | { ok: false; error: string };

/**
 * Compiles an expression in several variables, such as f(x, y) for a
 * surface. Same rules as compileIn: other symbols must be built-in or in
 * `scope`, and the function yields NaN where the result is not a real number.
 */
export function compileInVariables(
  source: string,
  variables: string[],
  scope: Scope,
  angleMode: AngleMode = "rad",
): MultiCompileResult {
  const names = variables.join(" and ");
  if (!source.trim()) return { ok: false, error: `Enter an expression in ${names}` };
  try {
    const { math, parse } = getEngine(angleMode);
    const node = parse(source);
    if (node.type === "AssignmentNode" || node.type === "FunctionAssignmentNode") {
      return { ok: false, error: `Enter an expression in ${names}, such as ${variables.map((v) => `${v}^2`).join(" + ")} - 1` };
    }

    const unknown = new Set<string>();
    node.traverse((child) => {
      if (child.type !== "SymbolNode") return;
      const name = (child as unknown as { name: string }).name;
      if (!variables.includes(name) && !scope.has(name) && !(name in math)) unknown.add(name);
    });
    if (unknown.size > 0) {
      return { ok: false, error: `Undefined symbol${unknown.size > 1 ? "s" : ""}: ${[...unknown].join(", ")}` };
    }

    const compiled = node.compile();
    const local = new Map(scope);
    const fn: MultiFunction = (...values) => {
      for (let i = 0; i < variables.length; i++) local.set(variables[i], values[i]);
      try {
        const result = compiled.evaluate(local);
        if (typeof result === "number") return result;
        if (typeof result === "boolean") return Number(result);
        return NaN;
      } catch {
        return NaN;
      }
    };

    // KaTeX expects \theta rather than the Unicode letter.
    const tex = node.toTex({ parenthesis: "keep", implicit: "hide" }).replaceAll("θ", "\\theta ");
    return { ok: true, fn, tex };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** How a user function was defined, so it can be rebuilt elsewhere (the plotting worker). */
export type FunctionDefinition = { source: string; angleMode: AngleMode };

const DEFINITION = Symbol("definition");

/** Tags functions defined by `f(x) = …` in `node` with their source text. */
function recordDefinitions(node: { traverse: (cb: (child: { type: string }) => void) => void }, scope: Scope, angleMode: AngleMode) {
  node.traverse((child) => {
    if (child.type !== "FunctionAssignmentNode") return;
    const name = (child as unknown as { name: string }).name;
    const fn = scope.get(name);
    if (typeof fn === "function") {
      const definition: FunctionDefinition = { source: child.toString(), angleMode };
      Object.defineProperty(fn, DEFINITION, { value: definition });
    }
  });
}

/** The definition of a function created by `f(x) = …`, or null for anything else. */
export function functionDefinition(value: unknown): FunctionDefinition | null {
  return typeof value === "function" ? ((value as unknown as Record<symbol, FunctionDefinition>)[DEFINITION] ?? null) : null;
}

/** True for a Math.js matrix; `toArray` gives its plain nested-array form. */
export function isMatrix(value: unknown): value is { toArray: () => unknown[] } {
  return typeof value === "object" && value !== null && (value as { isMatrix?: boolean }).isMatrix === true;
}

/** Rebuilds a Math.js matrix from nested arrays. */
export function toMatrix(array: unknown[]): unknown {
  return getEngine("rad").math.matrix(array as number[]);
}

/** Converts `value` from one unit to another, e.g. (5, "inch", "cm") → 12.7. Throws on unknown or incompatible units. */
export function convertUnits(value: number, from: string, to: string): number {
  return getEngine("rad").math.unit(value, from).toNumber(to);
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

/** The values of a one-dimensional array or Math.js vector, else null. */
function asList(value: unknown): unknown[] | null {
  const array =
    Array.isArray(value)
      ? value
      : typeof value === "object" && value !== null && "toArray" in value && typeof value.toArray === "function"
        ? (value.toArray() as unknown[])
        : null;
  return array && array.length > 0 && array.every((item) => !Array.isArray(item)) ? array : null;
}

function resultToTex(value: unknown): string {
  if (typeof value === "function") return `\\text{${formatValue(value)}}`;
  // Show lists such as [1, 2, 3] as a row rather than Math.js' column vector.
  const list = asList(value);
  if (list) return `\\begin{bmatrix}${list.map((item) => formatValue(item)).join(" & ")}\\end{bmatrix}`;
  try {
    return parse(formatValue(value)).toTex();
  } catch {
    return `\\text{${formatValue(value)}}`;
  }
}

/** True when `name` is a built-in function or constant (sin, pi, speedOfLight, ...). */
export function isBuiltInName(name: string): boolean {
  return name in getEngine("rad").math;
}

/**
 * Compiles one statement or expression for repeated evaluation, as used by
 * the program interpreter. Throws on syntax errors. Evaluating it may change
 * the scope (assignments) and returns the last result.
 */
export function compileStatement(source: string, angleMode: AngleMode = "rad"): (scope: Scope) => unknown {
  const compiled = getEngine(angleMode).parse(source).compile();
  return (scope) => {
    const value = compiled.evaluate(scope);
    return isResultSet(value) ? value.entries.at(-1) : value;
  };
}
