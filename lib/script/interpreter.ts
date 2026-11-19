/**
 * A small line-based scripting language for user programs. Each line is a
 * control statement or a Math.js statement evaluated by the sandboxed engine:
 *
 *   s = 0                         assignment or any expression
 *   for i = 1 to n step 2 … end   counted loop (step is optional)
 *   for v in L1 … end             loop over a list
 *   while cond … end
 *   if cond … elseif cond … else … end
 *   print "label", value          output
 *   return value                  ends the program with a result
 *   break / continue
 *
 * `#` starts a comment. Programs run in their own scope: they can read the
 * calculator's variables and functions, but assignments stay local.
 */
import { compileStatement, formatValue, type AngleMode, type Scope } from "@/lib/math/engine";

export type Program = { id: string; name: string; params: string[]; body: string };

type Evaluator = { source: string; run: (scope: Scope) => unknown };

type Statement = { line: number } & (
  | { kind: "expr"; code: Evaluator }
  | { kind: "print"; args: Evaluator[] }
  | { kind: "return"; value: Evaluator | null }
  | { kind: "break" | "continue" }
  | { kind: "if"; branches: { cond: Evaluator; body: Statement[] }[]; otherwise: Statement[] }
  | { kind: "for"; variable: string; from: Evaluator; to: Evaluator; step: Evaluator | null; body: Statement[] }
  | { kind: "forIn"; variable: string; list: Evaluator; body: Statement[] }
  | { kind: "while"; cond: Evaluator; body: Statement[] }
);

export type ParseResult = { ok: true; statements: Statement[] } | { ok: false; error: string };

export type RunResult =
  | { ok: true; value: unknown; output: string[] }
  | { ok: false; error: string; output: string[] };

/** Statements one top-level run may execute before it is stopped. */
export const MAX_STEPS = 100_000;
/** Lower limit for calls with nowhere to show output (graphs, tables), which call programs many times. */
export const MAX_STEPS_BACKGROUND = 2_000;
/** The same limit in the plotting worker, where a long run can't freeze the page. */
export const MAX_STEPS_WORKER = 10_000;

let backgroundSteps = MAX_STEPS_BACKGROUND;

/** Raises the per-call limit for calls with nowhere to show output; the plotting worker uses MAX_STEPS_WORKER. */
export function setBackgroundStepLimit(steps: number): void {
  backgroundSteps = steps;
}
export const MAX_DEPTH = 64;
export const MAX_OUTPUT_LINES = 500;

export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

class ScriptError extends Error {}

/** Thrown to unwind loops and calls; never escapes runProgram. */
class Signal {
  constructor(
    readonly kind: "break" | "continue" | "return",
    readonly value?: unknown,
  ) {}
}

const lineError = (line: number, message: string) => new ScriptError(`Line ${line}: ${message}`);

function compile(source: string, line: number, angleMode: AngleMode): Evaluator {
  const text = source.trim();
  if (!text) throw lineError(line, "Expected an expression");
  try {
    return { source: text, run: compileStatement(text, angleMode) };
  } catch (err) {
    throw lineError(line, err instanceof Error ? err.message : String(err));
  }
}

/** Splits `a, "b, c", f(1, 2)` at top-level commas, respecting quotes and brackets. */
export function splitArguments(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "," && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((part) => part.trim());
}

/** Removes a `#` comment that is not inside a string. */
function stripComment(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "#") return text.slice(0, i);
  }
  return text;
}

const FOR_RANGE = /^for\s+([A-Za-z_]\w*)\s*=\s*(.+?)\s+to\s+(.+?)(?:\s+step\s+(.+))?$/;
const FOR_IN = /^for\s+([A-Za-z_]\w*)\s+in\s+(.+)$/;

/** Parses and compiles a program body. Errors name the line they occur on. */
export function parseProgram(body: string, angleMode: AngleMode = "rad"): ParseResult {
  const lines = body.split(/\r?\n/).map((raw, index) => ({ line: index + 1, text: stripComment(raw).trim() }));
  let pos = 0;

  const keyword = (text: string) => /^[a-z]+/.exec(text)?.[0] ?? "";

  /** Parses statements until one of `terminators` (or the end); returns the terminator line. */
  function block(terminators: string[]): { body: Statement[]; end: { line: number; text: string; word: string } | null } {
    const statements: Statement[] = [];
    while (pos < lines.length) {
      const { line, text } = lines[pos];
      const word = keyword(text);
      if (!text) {
        pos++;
        continue;
      }
      if (terminators.includes(word) || (word === "else" && terminators.includes("elseif") && /^else\s+if\b/.test(text))) {
        pos++;
        return { body: statements, end: { line, text, word } };
      }
      pos++;
      statements.push(statement(line, text, word));
    }
    return { body: statements, end: null };
  }

  function requireEnd(start: number, what: string, terminators: string[]) {
    const result = block(terminators);
    if (!result.end) throw lineError(start, `${what} has no matching end`);
    return result;
  }

  function statement(line: number, text: string, word: string): Statement {
    const rest = text.slice(word.length).trim();
    switch (word) {
      case "print":
        return { line, kind: "print", args: rest ? splitArguments(rest).map((arg) => compile(arg, line, angleMode)) : [] };
      case "return":
        return { line, kind: "return", value: rest ? compile(rest, line, angleMode) : null };
      case "break":
      case "continue":
        if (rest) throw lineError(line, `Unexpected text after ${word}`);
        return { line, kind: word };
      case "while": {
        const cond = compile(rest.replace(/\s+do$/, ""), line, angleMode);
        return { line, kind: "while", cond, body: requireEnd(line, "while", ["end"]).body };
      }
      case "for": {
        const range = FOR_RANGE.exec(text);
        if (range) {
          const [, variable, from, to, step] = range;
          return {
            line,
            kind: "for",
            variable,
            from: compile(from, line, angleMode),
            to: compile(to, line, angleMode),
            step: step ? compile(step, line, angleMode) : null,
            body: requireEnd(line, "for", ["end"]).body,
          };
        }
        const over = FOR_IN.exec(text);
        if (over) {
          const [, variable, list] = over;
          return { line, kind: "forIn", variable, list: compile(list, line, angleMode), body: requireEnd(line, "for", ["end"]).body };
        }
        throw lineError(line, "Write loops as: for i = 1 to 10 (step 2), or: for v in L1");
      }
      case "if": {
        const branches: { cond: Evaluator; body: Statement[] }[] = [];
        let cond = compile(rest.replace(/\s+then$/, ""), line, angleMode);
        let otherwise: Statement[] = [];
        for (;;) {
          const { body: branchBody, end } = requireEnd(line, "if", ["elseif", "else", "end"]);
          branches.push({ cond, body: branchBody });
          if (end!.word === "end") break;
          const elseIf = /^(?:elseif|else\s+if)\s+(.+?)(?:\s+then)?$/.exec(end!.text);
          if (elseIf) {
            cond = compile(elseIf[1], end!.line, angleMode);
            continue;
          }
          if (end!.text !== "else") throw lineError(end!.line, "Unexpected text after else");
          const elseBlock = block(["end"]);
          if (!elseBlock.end) throw lineError(line, "if has no matching end");
          otherwise = elseBlock.body;
          break;
        }
        return { line, kind: "if", branches, otherwise };
      }
      case "end":
      case "else":
      case "elseif":
        throw lineError(line, `${word} without a matching ${word === "end" ? "if, for or while" : "if"}`);
      default:
        return { line, kind: "expr", code: compile(text, line, angleMode) };
    }
  }

  try {
    const { body: statements, end } = block([]);
    if (end) throw lineError(end.line, `Unexpected ${end.word}`);
    return { ok: true, statements };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ----- Running -----

type RunContext = { steps: number; maxSteps: number; depth: number; output: string[] | null };

/** The outermost run in progress; nested program calls share its step count and output. */
let active: RunContext | null = null;
/** Where calls made from expressions send their output, set by captureOutput. */
let sink: string[] | null = null;

/** Runs `fn` and collects the output of any programs it calls (e.g. while evaluating an expression). */
export function captureOutput<T>(fn: () => T): { value: T; output: string[] } {
  const previous = sink;
  const output: string[] = [];
  sink = output;
  try {
    return { value: fn(), output };
  } finally {
    sink = previous;
  }
}

function display(value: unknown): string {
  return typeof value === "string" ? value : formatValue(value);
}

function truthy(value: unknown, line: number): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0 && !Number.isNaN(value);
  throw lineError(line, "A condition must be true/false or a number");
}

function toNumber(value: unknown, line: number, what: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw lineError(line, `The loop ${what} must be a number`);
  return value;
}

function toItems(value: unknown, line: number): unknown[] {
  const array = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && "toArray" in value && typeof value.toArray === "function"
      ? (value.toArray() as unknown[])
      : null;
  if (!array) throw lineError(line, "for … in needs a list, such as [1, 2, 3] or L1");
  return array;
}

function evaluate(code: Evaluator, scope: Scope, line: number): unknown {
  try {
    return code.run(scope);
  } catch (err) {
    if (err instanceof ScriptError || err instanceof Signal) throw err;
    throw lineError(line, err instanceof Error ? err.message : String(err));
  }
}

function countStep(context: RunContext, line: number) {
  if (++context.steps > context.maxSteps) {
    throw lineError(line, `Stopped after ${context.maxSteps.toLocaleString("en-US")} steps (an endless loop?)`);
  }
}

function execute(statements: Statement[], scope: Scope, context: RunContext): void {
  for (const stmt of statements) {
    countStep(context, stmt.line);
    switch (stmt.kind) {
      case "expr":
        evaluate(stmt.code, scope, stmt.line);
        break;
      case "print": {
        const text = stmt.args.map((arg) => display(evaluate(arg, scope, stmt.line))).join(" ");
        if (context.output && context.output.length < MAX_OUTPUT_LINES) context.output.push(text);
        break;
      }
      case "return":
        throw new Signal("return", stmt.value ? evaluate(stmt.value, scope, stmt.line) : undefined);
      case "break":
      case "continue":
        throw new Signal(stmt.kind);
      case "if": {
        const branch = stmt.branches.find((b) => truthy(evaluate(b.cond, scope, stmt.line), stmt.line));
        execute(branch ? branch.body : stmt.otherwise, scope, context);
        break;
      }
      case "while":
        while (truthy(evaluate(stmt.cond, scope, stmt.line), stmt.line)) {
          if (loopBody(stmt.body, scope, context, stmt.line)) break;
        }
        break;
      case "for": {
        const from = toNumber(evaluate(stmt.from, scope, stmt.line), stmt.line, "start");
        const to = toNumber(evaluate(stmt.to, scope, stmt.line), stmt.line, "end");
        const step = stmt.step ? toNumber(evaluate(stmt.step, scope, stmt.line), stmt.line, "step") : 1;
        if (step === 0) throw lineError(stmt.line, "The loop step can't be 0");
        // Count iterations instead of adding the step, so 0.1 steps don't drift.
        const count = Math.floor((to - from) / step + 1e-9) + 1;
        for (let k = 0; k < count; k++) {
          scope.set(stmt.variable, from + k * step);
          if (loopBody(stmt.body, scope, context, stmt.line)) break;
        }
        break;
      }
      case "forIn":
        for (const item of toItems(evaluate(stmt.list, scope, stmt.line), stmt.line)) {
          scope.set(stmt.variable, item);
          if (loopBody(stmt.body, scope, context, stmt.line)) break;
        }
        break;
    }
  }
}

/** Runs one loop iteration; returns true on break. */
function loopBody(body: Statement[], scope: Scope, context: RunContext, line: number): boolean {
  countStep(context, line); // so empty loops still stop
  try {
    execute(body, scope, context);
    return false;
  } catch (signal) {
    if (signal instanceof Signal && signal.kind === "break") return true;
    if (signal instanceof Signal && signal.kind === "continue") return false;
    throw signal;
  }
}

const parseCache = new WeakMap<Program, Partial<Record<AngleMode, ParseResult>>>();

function parsed(program: Program, angleMode: AngleMode): ParseResult {
  const byMode = parseCache.get(program) ?? {};
  parseCache.set(program, byMode);
  return (byMode[angleMode] ??= parseProgram(program.body, angleMode));
}

/** Runs a program with argument values. Throws ScriptError; use runProgram for a result object. */
function call(program: Program, args: unknown[], globals: Scope, angleMode: AngleMode): unknown {
  if (args.length !== program.params.length) {
    const n = program.params.length;
    throw new ScriptError(`${program.name} expects ${n} argument${n === 1 ? "" : "s"}, got ${args.length}`);
  }
  const result = parsed(program, angleMode);
  if (!result.ok) throw new ScriptError(`${program.name}: ${result.error}`);

  const outer = active;
  const context: RunContext = outer ?? {
    steps: 0,
    maxSteps: sink ? MAX_STEPS : backgroundSteps,
    depth: 0,
    output: sink,
  };
  if (context.depth >= MAX_DEPTH) throw new ScriptError(`${program.name}: calls nested more than ${MAX_DEPTH} deep`);

  const scope: Scope = new Map(globals);
  program.params.forEach((param, i) => scope.set(param, args[i]));
  context.depth++;
  active = context;
  try {
    execute(result.statements, scope, context);
    return undefined;
  } catch (signal) {
    if (signal instanceof Signal) {
      if (signal.kind === "return") return signal.value;
      throw new ScriptError(`${program.name}: ${signal.kind} outside a loop`);
    }
    // Name the program when the error came from a nested call.
    if (outer && signal instanceof ScriptError && !signal.message.startsWith(`${program.name}:`)) {
      throw new ScriptError(`${program.name}, ${signal.message}`);
    }
    throw signal;
  } finally {
    context.depth--;
    active = outer;
  }
}

/** Runs a program from the Programs panel, collecting its printed output. */
export function runProgram(program: Program, args: unknown[], globals: Scope, angleMode: AngleMode = "rad"): RunResult {
  const { value: result, output } = captureOutput((): { ok: true; value: unknown } | { ok: false; error: string } => {
    try {
      return { ok: true, value: call(program, args, globals, angleMode) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  return { ...result, output };
}

/** Marks scope entries created by programFunction. */
const PROGRAM_FUNCTION = Symbol("program");

export type ProgramFunction = ((...args: unknown[]) => unknown) & { syntax: string; program: Program; [PROGRAM_FUNCTION]: true };

/**
 * A function that runs `program`, for use in expressions (`fib(10)`). It reads
 * variables from `globals` at call time.
 */
export function programFunction(program: Program, globals: Scope, angleMode: AngleMode): ProgramFunction {
  const fn = (...args: unknown[]) => {
    const value = call(program, args, globals, angleMode);
    if (value === undefined) throw new ScriptError(`${program.name} didn't return a value`);
    return value;
  };
  return Object.assign(fn, { syntax: `${program.name}(${program.params.join(", ")})`, program, [PROGRAM_FUNCTION]: true as const });
}

export function isProgramFunction(value: unknown): value is ProgramFunction {
  return typeof value === "function" && PROGRAM_FUNCTION in value;
}

/**
 * Replaces the program functions in `scope` with ones for `programs`. A user
 * variable that shadows an old program's name is left alone.
 */
export function registerPrograms(scope: Scope, programs: Program[], angleMode: AngleMode): void {
  for (const [name, value] of [...scope]) if (isProgramFunction(value)) scope.delete(name);
  for (const program of programs) scope.set(program.name, programFunction(program, scope, angleMode));
}
