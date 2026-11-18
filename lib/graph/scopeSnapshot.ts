/**
 * Copies a calculator scope into plain data that can be posted to the
 * plotting worker, and rebuilds a working scope from it there. Functions
 * defined with `f(x) = …` are re-created from their source, and programs are
 * registered again; values that can't be copied (units, complex numbers) are
 * listed in `missing` so the caller can plot on the main thread instead.
 */
import {
  createScope,
  evaluateExpression,
  functionDefinition,
  isMatrix,
  toMatrix,
  type AngleMode,
  type FunctionDefinition,
  type Scope,
} from "@/lib/math/engine";
import { isProgramFunction, registerPrograms, type Program } from "@/lib/script/interpreter";

export type ScopeSnapshot = {
  values: [string, unknown][];
  matrices: [string, unknown[]][];
  functions: FunctionDefinition[];
  programs: Program[];
  missing: string[];
};

function isPlainData(value: unknown): boolean {
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return true;
  return Array.isArray(value) && value.every(isPlainData);
}

export function snapshotScope(scope: Scope): ScopeSnapshot {
  const snapshot: ScopeSnapshot = { values: [], matrices: [], functions: [], programs: [], missing: [] };
  for (const [name, value] of scope) {
    const definition = functionDefinition(value);
    if (definition) snapshot.functions.push(definition);
    else if (isProgramFunction(value)) snapshot.programs.push(value.program);
    else if (isPlainData(value)) snapshot.values.push([name, value]);
    else if (isMatrix(value) && isPlainData(value.toArray())) snapshot.matrices.push([name, value.toArray()]);
    else snapshot.missing.push(name);
  }
  return snapshot;
}

export function restoreScope(snapshot: ScopeSnapshot, angleMode: AngleMode): Scope {
  const scope = createScope();
  for (const [name, value] of snapshot.values) scope.set(name, value);
  for (const [name, array] of snapshot.matrices) scope.set(name, toMatrix(array));
  for (const definition of snapshot.functions) evaluateExpression(definition.source, scope, definition.angleMode);
  registerPrograms(scope, snapshot.programs, angleMode);
  return scope;
}

/**
 * True when plotting `source` might need a value the snapshot couldn't copy,
 * directly or through a function or program that mentions it.
 */
export function needsMissing(source: string, snapshot: ScopeSnapshot): boolean {
  if (snapshot.missing.length === 0) return false;
  const texts = [source, ...snapshot.functions.map((f) => f.source), ...snapshot.programs.map((p) => p.body)];
  return snapshot.missing.some((name) => {
    const word = new RegExp(`(^|[^A-Za-z0-9_])${name.replace(/[$]/g, "\\$")}([^A-Za-z0-9_]|$)`);
    return texts.some((text) => word.test(text));
  });
}
