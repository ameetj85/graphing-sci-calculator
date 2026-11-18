"use client";

import { useMemo, useState } from "react";
import { convertUnits } from "@/lib/math/engine";
import { UNIT_CATEGORIES } from "@/lib/math/units";

type UnitsPanelProps = {
  /** Inserts a conversion such as "5 inch to cm" into the expression input. */
  onInsert: (text: string) => void;
};

const selectClass = "rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950";

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value !== 0 && (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-6)) return value.toExponential(8).replace(/\.?0+e/, "e");
  return String(Number(value.toPrecision(10)));
}

export function UnitsPanel({ onInsert }: UnitsPanelProps) {
  const [categoryId, setCategoryId] = useState(UNIT_CATEGORIES[0].id);
  const category = UNIT_CATEGORIES.find((c) => c.id === categoryId) ?? UNIT_CATEGORIES[0];
  const [from, setFrom] = useState(category.units[0].name);
  const [to, setTo] = useState(category.units[1].name);
  const [valueText, setValueText] = useState("1");

  const value = Number(valueText);
  const result = useMemo((): { ok: true; value: number } | { ok: false; error: string } => {
    if (valueText.trim() === "" || !Number.isFinite(value)) return { ok: false, error: "Enter a number" };
    try {
      return { ok: true, value: convertUnits(value, from, to) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, [value, valueText, from, to]);

  function changeCategory(id: string) {
    const next = UNIT_CATEGORIES.find((c) => c.id === id) ?? UNIT_CATEGORIES[0];
    setCategoryId(next.id);
    setFrom(next.units[0].name);
    setTo(next.units[1].name);
  }

  const unitSelect = (value: string, onChange: (name: string) => void, label: string) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`${selectClass} min-w-0 flex-1`}>
      {category.units.map((unit) => (
        <option key={unit.name} value={unit.name}>
          {unit.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        Quantity
        <select value={category.id} onChange={(e) => changeCategory(e.target.value)} className={selectClass}>
          {UNIT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={valueText}
          onChange={(e) => setValueText(e.target.value)}
          inputMode="decimal"
          aria-label="Value to convert"
          className="w-28 rounded-md border border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
        {unitSelect(from, setFrom, "From unit")}
        <button
          type="button"
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
          aria-label="Swap units"
          title="Swap units"
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          ⇄
        </button>
        {unitSelect(to, setTo, "To unit")}
      </div>

      <div className="flex flex-wrap items-baseline gap-3 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950" aria-live="polite">
        {result.ok ? (
          <>
            <span className="font-mono text-lg text-zinc-900 dark:text-zinc-50">
              {valueText} {from} = <strong>{formatResult(result.value)}</strong> {to}
            </span>
            <button
              type="button"
              onClick={() => onInsert(`${valueText} ${from} to ${to}`)}
              className="ml-auto rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Insert into expression
            </button>
          </>
        ) : (
          <span className="text-sm text-red-600 dark:text-red-400">{result.error}</span>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        You can also type conversions directly, e.g. <code>5 inch to cm</code>, <code>60 mi/h to km/h</code>,{" "}
        <code>100 degF to degC</code>, or combine units: <code>2 hour + 30 minute to minute</code>.
      </p>
    </div>
  );
}
