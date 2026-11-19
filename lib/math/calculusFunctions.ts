/**
 * nDeriv, fnInt and solve for expressions, in the style of a TI-84:
 *
 *   nDeriv(x^2, x, 3)          derivative of x^2 at x = 3          → 6
 *   fnInt(x^2, x, 0, 1)        integral of x^2 from 0 to 1         → 1/3
 *   solve(x^3 - 2x - 5, x, 2)  root of x^3 - 2x - 5 near x = 2     → 2.0945514815
 *   solve(x^2 - 2, x, 0, 5)    root between 0 and 5                → √2
 *   solve(cos(x) == x, x, 1)   an equation, written with ==        → 0.739085133215
 *
 * They take their first argument unevaluated (Math.js "rawArgs"), so the
 * variable is bound only inside it: `y = fnInt(t^2, t, 0, x)` graphs the
 * running integral. The functions run inside the calling engine instance,
 * so trig follows its angle mode.
 */
import type { MathNode } from "mathjs";
import { derivativeAt, integrate, rootInBracket, rootNear } from "./calculus";

type MapLike = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => unknown;
  has: (key: string) => boolean;
  keys: () => Iterable<string>;
  delete?: (key: string) => boolean;
};

type Compiled = { evaluate: (scope: MapLike) => unknown };

/** Names of the functions whose second argument is a bound variable. */
export const CALCULUS_FUNCTIONS = ["nDeriv", "fnInt", "solve"] as const;

/**
 * A scope that reads through to `parent` but keeps its own assignments, with
 * `name` bound to a value. Math.js accepts any object with get, set, has and
 * keys as a scope.
 */
class BoundScope implements MapLike {
  private readonly local = new Map<string, unknown>();

  constructor(
    private readonly parent: MapLike,
    private readonly name: string,
  ) {}

  bind(value: number) {
    this.local.clear();
    this.local.set(this.name, value);
  }

  get(key: string) {
    return this.local.has(key) ? this.local.get(key) : this.parent.get(key);
  }
  set(key: string, value: unknown) {
    this.local.set(key, value);
    return this;
  }
  has(key: string) {
    return this.local.has(key) || this.parent.has(key);
  }
  keys() {
    return new Set([...this.parent.keys(), ...this.local.keys()]).values();
  }
  delete(key: string) {
    return this.local.delete(key);
  }
}

// Compiling is the slow part, and graphs call these functions hundreds of
// times per frame with the same nodes.
const compiledNodes = new WeakMap<MathNode, Compiled>();
function compile(node: MathNode): Compiled {
  let compiled = compiledNodes.get(node);
  if (!compiled) {
    compiled = node.compile() as unknown as Compiled;
    compiledNodes.set(node, compiled);
  }
  return compiled;
}

function evaluateNumber(name: string, node: MathNode, scope: MapLike, what: string): number {
  const value = compile(node).evaluate(scope);
  const number = typeof value === "boolean" ? Number(value) : value;
  if (typeof number !== "number" || Number.isNaN(number)) throw new Error(`${name}: the ${what} must be a real number`);
  return number;
}

/**
 * The expression in args[0] as a function of the variable named in args[1].
 * `a == b` becomes a - b, so solve can take an equation.
 */
function asFunction(name: string, args: MathNode[], scope: MapLike, usage: string): (v: number) => number {
  const [expression, variable] = args;
  if (!variable || variable.type !== "SymbolNode") {
    throw new Error(`${name}: the second argument must be a variable name, as in ${usage}`);
  }
  if (name === "solve" && expression.type === "OperatorNode" && (expression as unknown as { fn: string }).fn === "equal") {
    const [lhs, rhs] = (expression as unknown as { args: MathNode[] }).args;
    const left = compile(lhs);
    const right = compile(rhs);
    const bound = new BoundScope(scope, (variable as unknown as { name: string }).name);
    return (v) => {
      bound.bind(v);
      return toReal(() => (left.evaluate(bound) as number) - (right.evaluate(bound) as number));
    };
  }
  const compiled = compile(expression);
  const bound = new BoundScope(scope, (variable as unknown as { name: string }).name);
  return (v) => {
    bound.bind(v);
    return toReal(() => compiled.evaluate(bound));
  };
}

/** Runs `get` and returns its value if it's a real number, else NaN. */
function toReal(get: () => unknown): number {
  try {
    const value = get();
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return Number(value);
    return NaN;
  } catch {
    return NaN;
  }
}

function checkArgCount(name: string, args: MathNode[], counts: number[], usage: string) {
  if (!counts.includes(args.length)) throw new Error(`${name} takes ${counts.join(" or ")} arguments, as in ${usage}`);
}

const raw = <T extends (...args: never[]) => unknown>(fn: T) => Object.assign(fn, { rawArgs: true });

export const CALCULUS = {
  nDeriv: raw((args: MathNode[], _math: unknown, scope: MapLike) => {
    const usage = "nDeriv(x^2, x, 3)";
    checkArgCount("nDeriv", args, [3], usage);
    const f = asFunction("nDeriv", args, scope, usage);
    const at = evaluateNumber("nDeriv", args[2], scope, "point");
    const value = derivativeAt(f, at);
    if (Number.isNaN(value)) throw new Error(`nDeriv: the expression isn't defined around ${at}`);
    return value;
  }),

  fnInt: raw((args: MathNode[], _math: unknown, scope: MapLike) => {
    const usage = "fnInt(x^2, x, 0, 1)";
    checkArgCount("fnInt", args, [4], usage);
    const f = asFunction("fnInt", args, scope, usage);
    const from = evaluateNumber("fnInt", args[2], scope, "lower bound");
    const to = evaluateNumber("fnInt", args[3], scope, "upper bound");
    if (!Number.isFinite(from) || !Number.isFinite(to)) throw new Error("fnInt: the bounds must be finite");
    const value = integrate(f, from, to);
    if (Number.isNaN(value)) {
      throw new Error(`fnInt: no result; is the expression undefined somewhere between ${from} and ${to}?`);
    }
    return value;
  }),

  solve: raw((args: MathNode[], _math: unknown, scope: MapLike) => {
    const usage = "solve(x^2 - 2, x, 1)";
    checkArgCount("solve", args, [3, 4], usage);
    const f = asFunction("solve", args, scope, usage);
    if (args.length === 4) {
      const a = evaluateNumber("solve", args[2], scope, "lower bound");
      const b = evaluateNumber("solve", args[3], scope, "upper bound");
      const root = rootInBracket(f, a, b);
      if (root === null) throw new Error(`solve: no root found between ${a} and ${b} (the expression must change sign there)`);
      return root;
    }
    const guess = evaluateNumber("solve", args[2], scope, "starting guess");
    const root = rootNear(f, guess);
    if (root === null) throw new Error(`solve: no root found near ${guess}`);
    return root;
  }),
};
