/**
 * Data lists and saved matrices, persisted in localStorage and exposed to
 * expressions as variables (L1, L2, A, B, ...).
 */
import { parseList } from "@/lib/stats/stats";

export type DataLists = { l1: string; l2: string };
export type Matrix = number[][];
export type Matrices = Record<string, Matrix>;

export const DATA_KEY = "gsc.data.v1";
export const MATRICES_KEY = "gsc.matrices.v1";
export const MATRIX_NAMES = ["A", "B", "C", "D", "E", "F"] as const;
export const MAX_MATRIX_SIZE = 6;
export const EMPTY_DATA: DataLists = { l1: "", l2: "" };

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function readJson(storage: StorageLike | undefined, key: string): unknown {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeJson(storage: StorageLike | undefined, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: keep the data in memory only.
  }
}

export function loadData(storage: StorageLike | undefined): DataLists {
  const value = readJson(storage, DATA_KEY) as Partial<DataLists> | null;
  return {
    l1: typeof value?.l1 === "string" ? value.l1 : "",
    l2: typeof value?.l2 === "string" ? value.l2 : "",
  };
}

export function isValidMatrix(value: unknown): value is Matrix {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_MATRIX_SIZE) return false;
  const cols = Array.isArray(value[0]) ? value[0].length : 0;
  if (cols < 1 || cols > MAX_MATRIX_SIZE) return false;
  return value.every(
    (row) => Array.isArray(row) && row.length === cols && row.every((cell) => typeof cell === "number" && Number.isFinite(cell)),
  );
}

export function loadMatrices(storage: StorageLike | undefined): Matrices {
  const value = readJson(storage, MATRICES_KEY);
  if (typeof value !== "object" || value === null) return {};
  const matrices: Matrices = {};
  for (const name of MATRIX_NAMES) {
    const matrix = (value as Record<string, unknown>)[name];
    if (isValidMatrix(matrix)) matrices[name] = matrix;
  }
  return matrices;
}

/** Variables that the data lists and matrices define, for the calculator scope. */
export function workspaceVariables(data: DataLists, matrices: Matrices): Map<string, unknown> {
  const variables = new Map<string, unknown>();
  const l1 = parseList(data.l1).values;
  const l2 = parseList(data.l2).values;
  if (l1.length) variables.set("L1", l1);
  if (l2.length) variables.set("L2", l2);
  for (const [name, matrix] of Object.entries(matrices)) variables.set(name, matrix);
  return variables;
}

export const WORKSPACE_VARIABLES = ["L1", "L2", ...MATRIX_NAMES];
