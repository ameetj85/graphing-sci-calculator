"use client";

import { useState } from "react";
import { rangeIncluding, snapToStep, stepFor, type SliderRange } from "@/lib/graph/sliders";

type Slider = { name: string; value: number; range: SliderRange };

type SliderListProps = {
  sliders: Slider[];
  /** Undefined names in the equations that could become sliders. */
  missing: string[];
  onChange: (name: string, value: number) => void;
  onRangeChange: (name: string, range: SliderRange) => void;
  onAdd: (name: string) => void;
};

const numberField =
  "w-16 rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950";

/**
 * A slider for each free variable of the graphed equations, with editable
 * bounds, plus buttons that create a slider for an undefined name.
 */
export function SliderList({ sliders, missing, onChange, onRangeChange, onAdd }: SliderListProps) {
  if (sliders.length === 0 && missing.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" aria-label="Sliders">
      {sliders.map((slider) => (
        <SliderRow key={slider.name} slider={slider} onChange={onChange} onRangeChange={onRangeChange} />
      ))}
      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>Add a slider:</span>
          {missing.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onAdd(name)}
              title={`Define ${name} = 1 and show a slider for it`}
              className="rounded-md border border-dashed border-zinc-300 px-2 py-0.5 font-mono text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              + {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SliderRow({
  slider,
  onChange,
  onRangeChange,
}: {
  slider: Slider;
  onChange: SliderListProps["onChange"];
  onRangeChange: SliderListProps["onRangeChange"];
}) {
  const { name, value } = slider;
  const range = rangeIncluding(slider.range, value);
  // Text being typed into the value and bound fields, until it is a valid number.
  const [draft, setDraft] = useState<{ field: "value" | "min" | "max"; text: string } | null>(null);

  const shown = (field: "value" | "min" | "max", current: number) =>
    draft?.field === field ? draft.text : String(current);

  function edit(field: "value" | "min" | "max", text: string) {
    setDraft({ field, text });
    const number = Number(text);
    if (text.trim() === "" || !Number.isFinite(number)) return;
    if (field === "value") onChange(name, number);
    else if (field === "min" && number < range.max) onRangeChange(name, { min: number, max: range.max, step: stepFor(number, range.max) });
    else if (field === "max" && number > range.min) onRangeChange(name, { min: range.min, max: number, step: stepFor(range.min, number) });
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={`slider-${name}`} className="w-10 shrink-0 truncate text-right font-mono text-zinc-700 dark:text-zinc-300">
        {name}
      </label>
      <input
        aria-label={`${name} minimum`}
        className={numberField}
        value={shown("min", range.min)}
        onChange={(e) => edit("min", e.target.value)}
        onBlur={() => setDraft(null)}
        inputMode="decimal"
      />
      <input
        id={`slider-${name}`}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(name, snapToStep(Number(e.target.value), range))}
        className="min-w-0 flex-1 accent-blue-600"
      />
      <input
        aria-label={`${name} maximum`}
        className={numberField}
        value={shown("max", range.max)}
        onChange={(e) => edit("max", e.target.value)}
        onBlur={() => setDraft(null)}
        inputMode="decimal"
      />
      <span className="text-zinc-400">=</span>
      <input
        aria-label={`${name} value`}
        className={numberField}
        value={shown("value", value)}
        onChange={(e) => edit("value", e.target.value)}
        onBlur={() => setDraft(null)}
        inputMode="decimal"
      />
    </div>
  );
}
