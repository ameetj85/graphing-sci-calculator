import { describe, expect, it } from "vitest";
import { DATA_KEY, MATRICES_KEY, isValidMatrix, loadData, loadMatrices, workspaceVariables, writeJson } from "./workspace";

function memoryStorage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("workspace storage", () => {
  it("round-trips data lists and matrices", () => {
    const storage = memoryStorage();
    writeJson(storage, DATA_KEY, { l1: "1 2 3", l2: "4 5 6" });
    writeJson(storage, MATRICES_KEY, { A: [[1, 2], [3, 4]], Z: [[1]], B: [[1, 2], [3]] });
    expect(loadData(storage)).toEqual({ l1: "1 2 3", l2: "4 5 6" });
    // Unknown names and ragged matrices are dropped.
    expect(loadMatrices(storage)).toEqual({ A: [[1, 2], [3, 4]] });
  });

  it("falls back to empty values", () => {
    expect(loadData(undefined)).toEqual({ l1: "", l2: "" });
    expect(loadMatrices(memoryStorage())).toEqual({});
  });

  it("validates matrix shape and contents", () => {
    expect(isValidMatrix([[1]])).toBe(true);
    expect(isValidMatrix([])).toBe(false);
    expect(isValidMatrix([[1, NaN]])).toBe(false);
    expect(isValidMatrix(Array.from({ length: 7 }, () => [1]))).toBe(false);
  });

  it("exposes lists and matrices as variables", () => {
    const vars = workspaceVariables({ l1: "1, 2", l2: "" }, { A: [[1]] });
    expect([...vars.keys()]).toEqual(["L1", "A"]);
    expect(vars.get("L1")).toEqual([1, 2]);
  });
});
