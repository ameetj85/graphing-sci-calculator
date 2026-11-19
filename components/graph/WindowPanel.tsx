"use client";

import { useState } from "react";
import { MAX_AXIS_LABEL_LENGTH, isValidWindow, type GraphSettings, type GraphWindow } from "@/lib/graph/equations";
import { createScope, evaluateExpression, type AngleMode } from "@/lib/math/engine";

type WindowPanelProps = {
  /** The window currently on screen, to fill the bound fields. */
  current: GraphWindow;
  settings: GraphSettings;
  angleMode: AngleMode;
  onApply: (window: GraphWindow) => void;
  /** Grid, numbers and labels apply as they change. */
  onSettingsChange: (settings: GraphSettings) => void;
  onClose: () => void;
};

const BOUNDS = [
  ["xMin", "x min"],
  ["xMax", "x max"],
  ["yMin", "y min"],
  ["yMax", "y max"],
] as const;

const round = (n: number) => String(Number(n.toPrecision(6)));

/** Reads a bound, which may be an expression such as 2pi or -pi/2. */
function readBound(text: string, angleMode: AngleMode): number | null {
  const result = evaluateExpression(text, createScope(), angleMode);
  return result.ok && typeof result.value === "number" && Number.isFinite(result.value) ? result.value : null;
}

const field =
  "w-full rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950";

/** Exact graph bounds, grid and axis options, and axis titles. */
export function WindowPanel({ current, settings, angleMode, onApply, onSettingsChange, onClose }: WindowPanelProps) {
  const [texts, setTexts] = useState(() => ({
    xMin: round(current.xMin),
    xMax: round(current.xMax),
    yMin: round(current.yMin),
    yMax: round(current.yMax),
  }));
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const values = Object.fromEntries(BOUNDS.map(([key]) => [key, readBound(texts[key], angleMode)])) as Record<
      keyof GraphWindow,
      number | null
    >;
    const missing = BOUNDS.find(([key]) => values[key] === null);
    if (missing) return setError(`Enter a number for ${missing[1]} (expressions such as 2pi work)`);
    const window = values as GraphWindow;
    if (!isValidWindow(window)) return setError("Each max must be larger than its min");
    setError(null);
    onApply(window);
  }

  return (
    <form
      aria-label="Graph window"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="absolute top-11 right-2 z-10 w-72 rounded-xl border border-zinc-200 bg-white p-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium text-zinc-800 dark:text-zinc-100">Window</h3>
        <button type="button" onClick={onClose} aria-label="Close window settings" className="px-1 text-lg leading-none text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
          ×
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {BOUNDS.map(([key, label]) => (
          <label key={key} className="flex flex-col gap-0.5 text-xs text-zinc-500">
            {label}
            <input
              value={texts[key]}
              onChange={(e) => setTexts((t) => ({ ...t, [key]: e.target.value }))}
              className={field}
              inputMode="decimal"
            />
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" className="mt-2 w-full rounded-md bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700">
        Apply window
      </button>

      <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
        <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={settings.grid} onChange={(e) => onSettingsChange({ ...settings, grid: e.target.checked })} />
          Grid lines
        </label>
        <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" checked={settings.numbers} onChange={(e) => onSettingsChange({ ...settings, numbers: e.target.checked })} />
          Axis numbers
        </label>
        {(["xLabel", "yLabel"] as const).map((key) => (
          <label key={key} className="flex flex-col gap-0.5 text-xs text-zinc-500">
            {key === "xLabel" ? "x-axis title" : "y-axis title"}
            <input
              value={settings[key]}
              maxLength={MAX_AXIS_LABEL_LENGTH}
              placeholder={key === "xLabel" ? "e.g. time (s)" : "e.g. height (m)"}
              onChange={(e) => onSettingsChange({ ...settings, [key]: e.target.value })}
              className={field}
            />
          </label>
        ))}
      </div>
    </form>
  );
}
