"use client";

import { useMemo, useState } from "react";
import { formatCoordinate } from "@/lib/graph/keyPoints";
import { TABLE_ROWS, rowIndexNear, tableRows } from "@/lib/graph/table";
import { createScope, evaluateExpression, type AngleMode } from "@/lib/math/engine";
import type { GraphCurve } from "./Graph";

type ValueTableProps = {
  curves: GraphCurve[];
  angleMode: AngleMode;
  /** x of the trace point, or null when tracing is off. */
  traceX: number | null;
  /** Called when a row is clicked, to move the trace point there. */
  onSelectX: (x: number) => void;
};

/** Reads a start/step field, which may be an expression such as pi/4. */
function parseNumber(text: string, angleMode: AngleMode): number | null {
  const result = evaluateExpression(text, createScope(), angleMode);
  return result.ok && typeof result.value === "number" && Number.isFinite(result.value) ? result.value : null;
}

export function ValueTable({ curves, angleMode, traceX, onSelectX }: ValueTableProps) {
  const [startText, setStartText] = useState("-5");
  const [stepText, setStepText] = useState("1");

  const start = parseNumber(startText, angleMode);
  const parsedStep = parseNumber(stepText, angleMode);
  const step = parsedStep !== null && parsedStep !== 0 ? parsedStep : null;

  const rows = useMemo(
    () => (start !== null && step !== null ? tableRows(curves.map((c) => c.fn), start, step) : []),
    [curves, start, step],
  );
  const highlighted = traceX !== null && step !== null ? rowIndexNear(rows.map((r) => r.x), traceX, step) : -1;

  function centerOnTrace() {
    if (traceX === null || step === null) return;
    const center = Math.round(traceX / step) * step;
    setStartText(String(Number((center - Math.floor(TABLE_ROWS / 2) * step).toPrecision(12))));
  }

  const fieldClass =
    "w-24 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950";

  return (
    <section
      aria-labelledby="table-heading"
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="table-heading" className="mr-auto text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Table of values
        </h2>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          Start
          <input
            value={startText}
            onChange={(e) => setStartText(e.target.value)}
            aria-invalid={start === null}
            className={fieldClass}
            spellCheck={false}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          Step
          <input
            value={stepText}
            onChange={(e) => setStepText(e.target.value)}
            aria-invalid={step === null}
            className={fieldClass}
            spellCheck={false}
          />
        </label>
        {traceX !== null && (
          <button
            type="button"
            onClick={centerOnTrace}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Center on trace
          </button>
        )}
      </div>

      {curves.length === 0 ? (
        <p className="text-sm text-zinc-400">Graph a function to see its values here.</p>
      ) : start === null || step === null ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Enter a number for Start and a non-zero number for Step (expressions such as <code>pi/4</code> work).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-sm tabular-nums">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th scope="col" className="px-2 py-1 font-medium">x</th>
                {curves.map((curve) => (
                  <th key={curve.id} scope="col" className="px-2 py-1 font-medium" style={{ color: curve.color }}>
                    {curve.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.x}
                  onClick={() => onSelectX(row.x)}
                  title="Move the trace point here"
                  className={`cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/60 ${
                    i === highlighted ? "bg-blue-50 dark:bg-blue-950/40" : ""
                  }`}
                >
                  <td className="px-2 py-1 text-zinc-500">{formatCoordinate(row.x)}</td>
                  {row.values.map((value, j) => (
                    <td key={curves[j].id} className="px-2 py-1 text-zinc-900 dark:text-zinc-100">
                      {Number.isFinite(value) ? formatCoordinate(value) : <span className="text-zinc-400">undefined</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-zinc-500">Click a row to move the trace point to that x.</p>
    </section>
  );
}
