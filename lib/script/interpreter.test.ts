import { describe, expect, it } from "vitest";
import { createScope, evaluateExpression, formatValue } from "@/lib/math/engine";
import {
  MAX_STEPS,
  MAX_STEPS_BACKGROUND,
  MAX_STEPS_WORKER,
  captureOutput,
  isProgramFunction,
  parseProgram,
  registerPrograms,
  runProgram,
  setBackgroundStepLimit,
  splitArguments,
  type Program,
} from "./interpreter";
import { examplePrograms, loadPrograms, parseParams, validateProgram } from "./programs";

let nextId = 0;
const program = (body: string, params: string[] = [], name = "prog"): Program => ({ id: `t${nextId++}`, name, params, body });
const run = (body: string, params: string[] = [], args: unknown[] = []) => runProgram(program(body, params), args, createScope());

describe("parsing", () => {
  it("splits print arguments at top-level commas only", () => {
    expect(splitArguments(`"a, b", f(1, 2), [3, 4]`)).toEqual([`"a, b"`, "f(1, 2)", "[3, 4]"]);
  });

  it("reports unmatched blocks and syntax errors with line numbers", () => {
    expect(parseProgram("x = 1\nfor i = 1 to 3\n  x = x + i")).toEqual({ ok: false, error: "Line 2: for has no matching end" });
    expect(parseProgram("end")).toMatchObject({ ok: false, error: expect.stringMatching(/^Line 1: end without/) });
    expect(parseProgram("x = 1\ny = (2")).toMatchObject({ ok: false, error: expect.stringMatching(/^Line 2: /) });
    expect(parseProgram("for i from 1")).toMatchObject({ ok: false, error: expect.stringMatching(/^Line 1: Write loops as/) });
    expect(parseProgram("if 1\nelse\nelse\nend")).toMatchObject({ ok: false, error: expect.stringMatching(/^Line 3: else without/) });
  });

  it("ignores comments and blank lines, but not # inside strings", () => {
    const result = run(`# heading\n\nprint "a # b" # trailing\nreturn 1 # done`);
    expect(result).toEqual({ ok: true, value: 1, output: ["a # b"] });
  });
});

describe("running", () => {
  it("runs counted loops, including fractional and negative steps", () => {
    expect(run("s = 0\nfor i = 1 to 100\n  s = s + i\nend\nreturn s")).toMatchObject({ value: 5050 });
    expect(run("n = 0\nfor t = 0 to 1 step 0.1\n  n = n + 1\nend\nreturn n")).toMatchObject({ value: 11 });
    expect(run("p = []\nfor i = 3 to 1 step -1\n  p = concat(p, [i])\nend\nreturn p").ok).toBe(true);
    expect(run("n = 0\nfor i = 5 to 1\n  n = n + 1\nend\nreturn n")).toMatchObject({ value: 0 });
  });

  it("loops over lists with for … in", () => {
    expect(run("s = 0\nfor v in [2, 4, 6]\n  s = s + v\nend\nreturn s")).toMatchObject({ value: 12 });
  });

  it("supports while, if/elseif/else, break and continue", () => {
    const body = `out = 0
i = 0
while true
  i = i + 1
  if i > 10
    break
  elseif mod(i, 2) == 0
    continue
  else if i == 5
    out = out + 100
  else
    out = out + i
  end
end
return out`;
    // 1 + 3 + 7 + 9 + 100
    expect(run(body)).toMatchObject({ ok: true, value: 120 });
  });

  it("prints labels and formatted values", () => {
    expect(run(`x = 1/3\nprint "x is", x, [1, 2]`).output).toEqual(["x is 0.333333333333 [1, 2]"]);
  });

  it("passes parameters and returns values", () => {
    expect(run("return a * b", ["a", "b"], [6, 7])).toMatchObject({ ok: true, value: 42 });
    expect(run("return a", ["a"], [])).toMatchObject({ ok: false, error: "prog expects 1 argument, got 0" });
  });

  it("returns undefined without a return statement", () => {
    expect(run("print 1")).toEqual({ ok: true, value: undefined, output: ["1"] });
  });

  it("reports runtime errors with the line number", () => {
    expect(run("x = 1\ny = q + 1")).toMatchObject({ ok: false, error: "Line 2: Undefined symbol q" });
    expect(run(`if "yes"\nend`)).toMatchObject({ ok: false, error: expect.stringMatching(/^Line 1: A condition/) });
    expect(run("for i = 1 to 2 step 0\nend")).toMatchObject({ ok: false, error: "Line 1: The loop step can't be 0" });
    expect(run("break")).toMatchObject({ ok: false, error: "prog: break outside a loop" });
  });

  it("stops endless loops, including empty ones", () => {
    expect(run("while true\nend")).toMatchObject({ ok: false, error: expect.stringContaining(`Stopped after ${MAX_STEPS.toLocaleString("en-US")}`) });
    expect(run("for i = 1 to 1e12\nend")).toMatchObject({ ok: false, error: expect.stringContaining("Stopped after") });
  });

  it("reads calculator variables but keeps assignments local", () => {
    const globals = createScope();
    globals.set("k", 10);
    const result = runProgram(program("k = k + 1\nreturn k"), [], globals);
    expect(result).toMatchObject({ ok: true, value: 11 });
    expect(globals.get("k")).toBe(10);
  });

  it("respects the angle mode", () => {
    expect(runProgram(program("return sin(90)"), [], createScope(), "deg")).toMatchObject({ value: 1 });
  });

  it("keeps expressions sandboxed", () => {
    expect(run(`return evaluate("1 + 1")`)).toMatchObject({ ok: false, error: expect.stringContaining("disabled") });
  });
});

describe("programs as functions", () => {
  it("makes saved programs callable from expressions, including recursion", () => {
    const scope = createScope();
    const fact = program("if n <= 1\n  return 1\nend\nreturn n * fact(n - 1)", ["n"], "fact");
    registerPrograms(scope, [fact], "rad");
    expect(evaluateExpression("fact(5) + 1", scope)).toMatchObject({ ok: true, display: "121" });
    expect(formatValue(scope.get("fact"))).toBe("fact(n)");
  });

  it("limits recursion depth", () => {
    const scope = createScope();
    registerPrograms(scope, [program("return loop(n + 1)", ["n"], "loop")], "rad");
    const result = evaluateExpression("loop(1)", scope);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("nested more than") });
  });

  it("collects printed output when captured, and uses a lower step limit otherwise", () => {
    const scope = createScope();
    registerPrograms(scope, [program(`print "hi"\nreturn 1`, [], "hello"), program("while true\nend", [], "spin")], "rad");
    const captured = captureOutput(() => evaluateExpression("hello() + hello()", scope));
    expect(captured.output).toEqual(["hi", "hi"]);
    expect(evaluateExpression("spin()", scope)).toMatchObject({
      ok: false,
      error: expect.stringContaining(`Stopped after ${MAX_STEPS_BACKGROUND.toLocaleString("en-US")}`),
    });
  });

  it("lets the plotting worker raise the background limit", () => {
    const scope = createScope();
    registerPrograms(scope, [program("while true\nend", [], "spin")], "rad");
    setBackgroundStepLimit(MAX_STEPS_WORKER);
    try {
      expect(evaluateExpression("spin()", scope)).toMatchObject({
        ok: false,
        error: expect.stringContaining(`Stopped after ${MAX_STEPS_WORKER.toLocaleString("en-US")}`),
      });
    } finally {
      setBackgroundStepLimit(MAX_STEPS_BACKGROUND);
    }
  });

  it("errors when a program used in an expression returns nothing", () => {
    const scope = createScope();
    registerPrograms(scope, [program("print 1", [], "noop")], "rad");
    expect(evaluateExpression("noop()", scope)).toMatchObject({ ok: false, error: "noop didn't return a value" });
  });

  it("replaces old program functions but keeps user variables", () => {
    const scope = createScope();
    registerPrograms(scope, [program("return 1", [], "one"), program("return 2", [], "two")], "rad");
    scope.set("two", 5); // user reassigned the name
    registerPrograms(scope, [program("return 3", [], "three")], "rad");
    expect(scope.has("one")).toBe(false);
    expect(scope.get("two")).toBe(5);
    expect(isProgramFunction(scope.get("three"))).toBe(true);
  });
});

describe("saved programs", () => {
  it("runs every example", () => {
    const programs = examplePrograms();
    const scope = createScope();
    registerPrograms(scope, programs, "rad");
    const call = (expr: string) => {
      const result = evaluateExpression(expr, scope);
      return result.ok ? result.display : result.error;
    };
    expect(call("sumTo(10)")).toBe("55");
    expect(call("fib(10)")).toBe("55");
    expect(call("quadratic(1, -3, 2)")).toBe("[2, 1]");
    expect(call("quadratic(1, 2, 1)")).toBe("-1");
    expect(call("quadratic(1, 0, 1)")).toBe("[i, -i]");
    expect(Number(call("newton(2)"))).toBeCloseTo(2.0945514815, 9);
    expect(call("collatz(27)")).toBe("111");
  });

  it("validates names and parameters", () => {
    const base = { params: [], body: "" };
    expect(validateProgram({ ...base, name: "" }, [])).toBe("Give the program a name");
    expect(validateProgram({ ...base, name: "2x" }, [])).toMatch(/^Names use/);
    expect(validateProgram({ ...base, name: "sin" }, [])).toBe("sin is a built-in function or constant");
    expect(validateProgram({ ...base, name: "L1" }, [])).toBe("L1 is reserved");
    expect(validateProgram({ ...base, name: "fib" }, examplePrograms())).toBe("There's already a program called fib");
    expect(validateProgram({ ...base, name: "f", params: ["a", "a"] }, [])).toBe("Parameter names must be different");
    expect(validateProgram({ ...base, name: "f", params: parseParams("a, b c") }, [])).toMatch(/^Parameter names must be names such as n or x, not "b c"/);
    expect(validateProgram({ ...base, name: "area", params: parseParams(" w , h ") }, [])).toBeNull();
  });

  it("starts with the examples, then loads what was saved", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(loadPrograms(storage).map((p) => p.name)).toEqual(["sumTo", "fib", "quadratic", "newton", "collatz"]);
    store.set("gsc.programs.v1", JSON.stringify([{ id: "a", name: "ok", params: [], body: "" }, { id: "b", name: "sin", params: [], body: "" }]));
    expect(loadPrograms(storage).map((p) => p.name)).toEqual(["ok"]);
    store.set("gsc.programs.v1", "[]");
    expect(loadPrograms(storage)).toEqual([]);
  });
});
