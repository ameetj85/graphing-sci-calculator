import { describe, expect, it } from "vitest";
import { compileFunction, createScope, evaluateExpression, expressionToTex } from "./engine";

function compileOk(expr: string, scope = createScope()) {
  const result = compileFunction(expr, scope);
  if (!result.ok) throw new Error(`expected "${expr}" to compile: ${result.error}`);
  return result.fn;
}

describe("compileFunction", () => {
  it("compiles an expression in x, with or without a leading y =", () => {
    expect(compileOk("x^2 - 1")(3)).toBe(8);
    expect(compileOk("y = 2x + 1")(2)).toBe(5);
    expect(compileOk("sin(x)")(Math.PI / 2)).toBe(1);
  });

  it("returns NaN where the function is undefined or not real", () => {
    expect(compileOk("sqrt(x)")(-1)).toBeNaN();
    expect(compileOk("log(x)")(-2)).toBeNaN();
  });

  it("uses variables and functions from the scope", () => {
    const scope = createScope();
    evaluateExpression("a = 3", scope);
    evaluateExpression("f(t) = t^2", scope);
    expect(compileOk("a f(x)", scope)(2)).toBe(12);
  });

  it("does not change the caller's scope", () => {
    const scope = createScope();
    compileOk("x + 1", scope)(5);
    expect(scope.has("x")).toBe(false);
  });

  it("reports undefined symbols, assignments and syntax errors", () => {
    const scope = createScope();
    const undefinedSymbol = compileFunction("k x", scope);
    expect(undefinedSymbol.ok === false && undefinedSymbol.error).toBe("Undefined symbol: k");
    expect(compileFunction("a = x", scope).ok).toBe(false);
    expect(compileFunction("x +", scope).ok).toBe(false);
    expect(compileFunction("y = ", scope).ok).toBe(false);
  });
});

function evalOk(expr: string, scope = createScope()) {
  const result = evaluateExpression(expr, scope);
  if (!result.ok) throw new Error(`expected success for "${expr}": ${result.error}`);
  return result;
}

describe("evaluateExpression", () => {
  it("respects order of operations and parentheses", () => {
    expect(evalOk("2 + 3 * 4").display).toBe("14");
    expect(evalOk("(2 + 3) * 4").display).toBe("20");
    expect(evalOk("2^3^2").display).toBe("512");
    expect(evalOk("-2^2").display).toBe("-4");
  });

  it("supports scientific functions and constants", () => {
    expect(evalOk("sin(pi / 2)").display).toBe("1");
    expect(evalOk("log(e)").display).toBe("1");
    expect(evalOk("log10(1000)").display).toBe("3");
    expect(evalOk("sqrt(16) + 5!").display).toBe("124");
  });

  it("formats very large and very small numbers in scientific notation", () => {
    expect(evalOk("10^25").display).toBe("1e+25");
    expect(evalOk("1 / 3").display).toBe("0.333333333333");
  });

  it("stores ans and user-defined variables", () => {
    const scope = createScope();
    evalOk("6 * 7", scope);
    expect(evalOk("ans + 1", scope).display).toBe("43");
    evalOk("r = 2", scope);
    expect(evalOk("pi r^2", scope).display).toBe("12.5663706144");
  });

  it("evaluates semicolon-separated statements and shows the last result", () => {
    const scope = createScope();
    expect(evalOk("r = 2; pi r^2", scope).display).toBe("12.5663706144");
    expect(evalOk("ans", scope).display).toBe("12.5663706144");
    expect(evaluateExpression("a = 1;", scope).ok).toBe(false);
    expect(evalOk("a + 1", scope).display).toBe("2");
  });

  it("supports user-defined functions", () => {
    const scope = createScope();
    evalOk("f(x) = x^2 + 1", scope);
    expect(evalOk("f(3)", scope).display).toBe("10");
  });

  it("returns errors instead of throwing", () => {
    const result = evaluateExpression("2 +", createScope());
    expect(result.ok).toBe(false);
    expect(evaluateExpression("", createScope()).ok).toBe(false);
    expect(evaluateExpression("foo + 1", createScope()).ok).toBe(false);
  });

  it("blocks functions disabled for safety", () => {
    expect(evaluateExpression('evaluate("1+1")', createScope()).ok).toBe(false);
    expect(evaluateExpression('import({}, {})', createScope()).ok).toBe(false);
  });
});

describe("expressionToTex", () => {
  it("renders TeX for valid input and null for incomplete input", () => {
    expect(expressionToTex("sqrt(x)")?.replace(/\s/g, "")).toBe("\\sqrt{x}");
    expect(expressionToTex("2 +")).toBeNull();
    expect(expressionToTex("  ")).toBeNull();
  });
});
