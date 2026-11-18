"use client";

import { useState } from "react";
import { Tex } from "@/components/Tex";
import { MATRIX_NAMES, MAX_MATRIX_SIZE, type Matrices, type Matrix } from "@/lib/calculator/workspace";
import { formatCoordinate } from "@/lib/graph/keyPoints";

type MatrixPanelProps = {
  matrices: Matrices;
  onSave: (name: string, matrix: Matrix) => void;
  onDelete: (name: string) => void;
  /** Inserts the matrix name into the expression input. */
  onInsert: (name: string) => void;
};

const SIZES = Array.from({ length: MAX_MATRIX_SIZE }, (_, i) => i + 1);

function emptyGrid(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => "0"));
}

function toGrid(matrix: Matrix): string[][] {
  return matrix.map((row) => row.map((cell) => String(cell)));
}

const matrixTex = (matrix: Matrix) =>
  `\\begin{bmatrix}${matrix.map((row) => row.map(formatCoordinate).join(" & ")).join(" \\\\ ")}\\end{bmatrix}`;

export function MatrixPanel({ matrices, onSave, onDelete, onInsert }: MatrixPanelProps) {
  const [name, setName] = useState<string>("A");
  const [grid, setGrid] = useState<string[][]>(() => (matrices.A ? toGrid(matrices.A) : emptyGrid(2, 2)));
  const [message, setMessage] = useState<string | null>(null);
  const rows = grid.length;
  const cols = grid[0].length;

  const resize = (nextRows: number, nextCols: number) =>
    setGrid((current) =>
      Array.from({ length: nextRows }, (_, r) => Array.from({ length: nextCols }, (_, c) => current[r]?.[c] ?? "0")),
    );

  function edit(matrixName: string) {
    setName(matrixName);
    setGrid(matrices[matrixName] ? toGrid(matrices[matrixName]) : emptyGrid(2, 2));
    setMessage(null);
  }

  function save() {
    const invalid = grid.some((row) => row.some((cell) => cell.trim() === "" || !Number.isFinite(Number(cell))));
    if (invalid) {
      setMessage("Every cell needs a number");
      return;
    }
    onSave(name, grid.map((row) => row.map(Number)));
    setMessage(`Saved as ${name}`);
  }

  const selectClass = "rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950";
  const saved = MATRIX_NAMES.filter((n) => matrices[n]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <label className="flex items-center gap-2">
          Matrix
          <select value={name} onChange={(e) => edit(e.target.value)} className={selectClass}>
            {MATRIX_NAMES.map((n) => (
              <option key={n} value={n}>
                {n}
                {matrices[n] ? " (saved)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Rows
          <select value={rows} onChange={(e) => resize(Number(e.target.value), cols)} className={selectClass}>
            {SIZES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Columns
          <select value={cols} onChange={(e) => resize(rows, Number(e.target.value))} className={selectClass}>
            {SIZES.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-1.5 border-x-2 border-zinc-400 px-2 dark:border-zinc-500"
          style={{ gridTemplateColumns: `repeat(${cols}, 4.5rem)` }}
          role="group"
          aria-label={`Matrix ${name} entries`}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <input
                key={`${r}-${c}`}
                value={cell}
                aria-label={`${name} row ${r + 1} column ${c + 1}`}
                onChange={(e) =>
                  setGrid((current) => current.map((rowCells, ri) => rowCells.map((v, ci) => (ri === r && ci === c ? e.target.value : v))))
                }
                onFocus={(e) => e.target.select()}
                inputMode="decimal"
                className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 text-right font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
            )),
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Save as {name}
        </button>
        {message && <span className="text-sm text-zinc-500">{message}</span>}
      </div>

      {saved.length > 0 && (
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {saved.map((n) => (
            <li key={n} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-mono font-semibold">{n} =</span>
              <Tex tex={matrixTex(matrices[n])} className="text-sm" />
              <span className="ml-auto flex gap-1">
                {[
                  { label: "Insert", action: () => onInsert(n) },
                  { label: "Edit", action: () => edit(n) },
                  { label: "Delete", action: () => onDelete(n) },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={action}
                    aria-label={`${label} ${n}`}
                    className="rounded-md border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    {label}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-zinc-500">
        Use saved matrices in expressions: <code>A*B</code>, <code>A + B</code>, <code>det(A)</code>, <code>inv(A)</code>{" "}
        or <code>A^-1</code>, <code>transpose(A)</code>, <code>A^2</code>. You can also type one directly, e.g.{" "}
        <code>[1, 2; 3, 4]</code>.
      </p>
    </div>
  );
}
