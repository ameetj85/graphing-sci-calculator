"use client";

import { useMemo, useState } from "react";
import type { DataLists } from "@/lib/calculator/workspace";
import { formatCoordinate } from "@/lib/graph/keyPoints";
import { REGRESSION_MODELS, fitRegression, formatCoefficient, parseList, summarize, type RegressionModel, type Summary } from "@/lib/stats/stats";

type StatsPanelProps = {
  data: DataLists;
  onDataChange: (data: DataLists) => void;
  plotData: boolean;
  onPlotDataChange: (plot: boolean) => void;
  /** Adds the fitted curve as an equation; returns an error message or null. */
  onGraphFit: (expression: string) => string | null;
};

const SUMMARY_ROWS: { key: keyof Summary; label: string }[] = [
  { key: "n", label: "n" },
  { key: "mean", label: "Mean x̄" },
  { key: "sampleSD", label: "Sample SD (Sx)" },
  { key: "populationSD", label: "Population SD (σx)" },
  { key: "sum", label: "Sum Σx" },
  { key: "min", label: "Min" },
  { key: "q1", label: "Q1" },
  { key: "median", label: "Median" },
  { key: "q3", label: "Q3" },
  { key: "max", label: "Max" },
];

const fieldClass =
  "w-full rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1.5 font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950";

export function StatsPanel({ data, onDataChange, plotData, onPlotDataChange, onGraphFit }: StatsPanelProps) {
  const [model, setModel] = useState<RegressionModel>("linear");
  const [fitMessage, setFitMessage] = useState<string | null>(null);

  const l1 = useMemo(() => parseList(data.l1), [data.l1]);
  const l2 = useMemo(() => parseList(data.l2), [data.l2]);
  const s1 = useMemo(() => summarize(l1.values), [l1]);
  const s2 = useMemo(() => summarize(l2.values), [l2]);
  const fit = useMemo(
    () => (l1.values.length || l2.values.length ? fitRegression(l1.values, l2.values, model) : null),
    [l1, l2, model],
  );

  const listField = (key: "l1" | "l2", label: string, parsed: typeof l1) => (
    <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
      <span>
        <span className="font-mono font-semibold">{label}</span>
        <span className="ml-2 text-xs text-zinc-400">
          {parsed.values.length} value{parsed.values.length === 1 ? "" : "s"}
        </span>
      </span>
      <textarea
        value={data[key]}
        onChange={(e) => onDataChange({ ...data, [key]: e.target.value })}
        rows={3}
        spellCheck={false}
        placeholder={key === "l1" ? "x values: 1, 2, 3, 4, 5" : "y values: 2.1, 3.9, 6.2, 7.8, 10.1"}
        className={fieldClass}
      />
      {parsed.invalid.length > 0 && (
        <span className="text-xs text-red-600 dark:text-red-400">Not a number: {parsed.invalid.join(", ")}</span>
      )}
    </label>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {listField("l1", "L1", l1)}
        {listField("l2", "L2", l2)}
      </div>

      {(s1 || s2) && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-sm tabular-nums">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
                <th scope="col" className="px-2 py-1 font-sans font-medium">One-variable stats</th>
                <th scope="col" className="px-2 py-1 font-medium">L1</th>
                <th scope="col" className="px-2 py-1 font-medium">L2</th>
              </tr>
            </thead>
            <tbody>
              {SUMMARY_ROWS.map(({ key, label }) => (
                <tr key={key} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                  <th scope="row" className="px-2 py-1 text-left font-sans font-normal text-zinc-500">{label}</th>
                  {[s1, s2].map((s, i) => (
                    <td key={i} className="px-2 py-1 text-zinc-900 dark:text-zinc-100">
                      {s && Number.isFinite(s[key]) ? formatCoordinate(s[key]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <label className="flex items-center gap-2">
            Regression of L2 on L1
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value as RegressionModel);
                setFitMessage(null);
              }}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {REGRESSION_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.form})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={plotData}
              onChange={(e) => onPlotDataChange(e.target.checked)}
              className="size-4 accent-blue-600"
            />
            Plot (L1, L2) points
          </label>
        </div>

        {!fit ? (
          <p className="text-sm text-zinc-400">Enter x values in L1 and y values in L2 to fit a curve.</p>
        ) : !fit.ok ? (
          <p className="text-sm text-red-600 dark:text-red-400">{fit.error}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
              y = {fit.fit.expression.replaceAll("*", "·")}
            </p>
            <p className="font-mono text-sm text-zinc-500">
              {fit.fit.coefficients.map((c) => `${c.name} = ${formatCoefficient(c.value)}`).join(", ")}; r² ={" "}
              {formatCoefficient(fit.fit.r2)}
            </p>
            <button
              type="button"
              onClick={() => setFitMessage(onGraphFit(fit.fit.expression) ?? "Added to the graph")}
              className="ml-auto rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Graph this fit
            </button>
          </div>
        )}
        {fitMessage && <p className="text-xs text-zinc-500">{fitMessage}</p>}
      </div>

      <p className="text-xs text-zinc-500">
        Use the lists in expressions, e.g. <code>mean(L1)</code>, <code>std(L2)</code>, <code>sum(L1 .* L2)</code>.
        Distributions: <code>normalpdf(x, μ, σ)</code>, <code>normalcdf(a, b, μ, σ)</code>, <code>invNorm(p, μ, σ)</code>,{" "}
        <code>binompdf(n, p, k)</code>, <code>binomcdf(n, p, k)</code>, <code>poissonpdf(λ, k)</code>,{" "}
        <code>poissoncdf(λ, k)</code>.
      </p>
    </div>
  );
}
