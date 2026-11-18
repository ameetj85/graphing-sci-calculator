import { all, create } from "mathjs";

/**
 * Sandboxed Math.js instance. Expressions come from user input, so functions
 * that could redefine the instance or re-enter the parser are disabled for
 * expressions (per the Math.js security guide). Internal references to the
 * parser are captured before they are overridden.
 */
const math = create(all, { number: "number", precision: 64 });

const parse = math.parse;
const format = math.format;

const disabled = (name: string) => () => {
  throw new Error(`Function ${name} is disabled`);
};

math.import(
  {
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
 * Evaluates an expression against the given scope. Assignments (`a = 3`,
 * `f(x) = x^2`) are stored in the scope. A successful non-function result is
 * also stored as `ans`.
 */
export function evaluateExpression(expr: string, scope: Scope): EvalResult {
  const source = expr.trim();
  if (!source) return { ok: false, error: "Enter an expression" };

  try {
    const node = parse(source);
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
