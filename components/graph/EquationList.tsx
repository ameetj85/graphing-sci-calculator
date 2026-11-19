"use client";

import { useState, type Dispatch } from "react";
import { ExpressionInput } from "@/components/calculator/ExpressionInput";
import type { EditorAction, EditorState } from "@/lib/calculator/editor";
import {
  EQUATION_COLORS,
  LINE_WIDTH_PX,
  MAX_EQUATIONS,
  dashArray,
  equationName,
  type Equation,
  type LineDash,
  type LineStyle,
  type LineWidth,
  type LookChange,
} from "@/lib/graph/equations";
import type { PlotResult } from "@/lib/graph/plotSpec";

type EquationListProps = {
  equations: Equation[];
  editorFor: (equation: Equation) => EditorState;
  dispatchFor: (id: string) => Dispatch<EditorAction>;
  compiled: Record<string, PlotResult>;
  activeId: string | null;
  registerInput: (id: string, element: HTMLInputElement | null) => void;
  onFocus: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onLookChange: (id: string, change: LookChange) => void;
  /** Which graph view is showing; surfaces are drawn only in 3D. */
  view: "2d" | "3d";
  onShow3D: () => void;
};

export function EquationList({
  equations,
  editorFor,
  dispatchFor,
  compiled,
  activeId,
  registerInput,
  onFocus,
  onToggleVisible,
  onRemove,
  onAdd,
  onLookChange,
  view,
  onShow3D,
}: EquationListProps) {
  const [styling, setStyling] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {equations.map((equation, index) => {
          const name = equationName(index);
          const result = compiled[equation.id];
          const error = equation.text.trim() && result && !result.ok ? result.error : null;
          const spec = result?.ok ? result.spec : null;
          const variable = spec?.kind === "polar" && spec.rangeLabel.startsWith("θ") ? "theta" : "t";
          const hint = !spec
            ? null
            : spec.kind === "surface"
              ? view === "3d"
                ? "3D surface"
                : "3D surface, drawn in the 3D view"
              : view === "3d"
                ? "Drawn in the 2D view"
                : spec.kind === "polar" || spec.kind === "parametric"
                  ? `${spec.kind === "polar" ? "Polar" : "Parametric"}, ${spec.rangeLabel}. End with {-5 <= ${variable} <= 5} to change the range.`
                  : spec.kind === "inequality" || spec.kind === "region"
                    ? `Shaded inequality${
                        (spec.kind === "region" ? spec.conditions.map((c) => c.op) : [spec.op]).some((op) => op === "<" || op === ">")
                          ? " (dashed edge: not included)"
                          : ""
                      }`
                    : spec.kind === "implicit"
                      ? "Implicit curve"
                      : spec.kind === "field"
                        ? spec.slope
                          ? "Slope field"
                          : "Vector field (darker arrows are longer vectors)"
                        : null;
          return (
            <li key={equation.id}>
              <div
                className={`flex items-center gap-2 rounded-xl p-1 ${
                  activeId === equation.id ? "ring-2 ring-blue-500/40 dark:ring-blue-400/40" : ""
                }`}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={equation.visible}
                  aria-label={`${equation.visible ? "Hide" : "Show"} ${name}`}
                  title={equation.visible ? "Hide this curve" : "Show this curve"}
                  onClick={() => onToggleVisible(equation.id)}
                  className="size-5 shrink-0 rounded-full border-2 transition-colors"
                  style={{
                    borderColor: equation.color,
                    background: equation.visible ? equation.color : "transparent",
                  }}
                />
                <label
                  htmlFor={`eq-${equation.id}`}
                  className="w-5 shrink-0 text-right font-mono text-sm text-zinc-500"
                  title={`Equation ${index + 1}; shown as ${name} in the table and trace`}
                >
                  {index + 1}
                </label>
                <ExpressionInput
                  id={`eq-${equation.id}`}
                  editor={editorFor(equation)}
                  dispatch={dispatchFor(equation.id)}
                  registerInput={(element) => registerInput(equation.id, element)}
                  onFocus={() => onFocus(equation.id)}
                  placeholder="x^2,  y > x,  x^2 + y^2 = 4,  z = sin(x) cos(y)"
                  className={equation.visible ? "" : "opacity-60"}
                />
                <button
                  type="button"
                  aria-label={`Style of ${name}`}
                  aria-expanded={styling === equation.id}
                  title="Colour, line type and thickness"
                  onClick={() => setStyling(styling === equation.id ? null : equation.id)}
                  className="shrink-0 rounded-md px-1.5 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
                    <line
                      x1="3"
                      y1="6"
                      x2="19"
                      y2="6"
                      strokeLinecap="round"
                      strokeWidth={LINE_WIDTH_PX[equation.style.width]}
                      strokeDasharray={dashArray(equation.style)}
                      style={{ stroke: equation.color }}
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  title="Remove"
                  onClick={() => onRemove(equation.id)}
                  className="shrink-0 rounded-md px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  ×
                </button>
              </div>
              {styling === equation.id && (
                <StylePicker
                  name={name}
                  color={equation.color}
                  style={equation.style}
                  onChange={(change) => onLookChange(equation.id, change)}
                />
              )}
              {error && <p className="mt-0.5 ml-14 text-xs text-red-600 dark:text-red-400">{error}</p>}
              {!error && hint && (
                <p className="mt-0.5 ml-14 text-xs text-zinc-500">
                  {hint}
                  {spec?.kind === "surface" && view === "2d" && (
                    <>
                      {" "}
                      <button type="button" onClick={onShow3D} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                        Show 3D view
                      </button>
                    </>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onAdd}
        disabled={equations.length >= MAX_EQUATIONS}
        className="self-start rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        + Add equation{equations.length >= MAX_EQUATIONS ? ` (max ${MAX_EQUATIONS})` : ""}
      </button>
    </div>
  );
}

const DASHES: { value: LineDash; label: string }[] = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];
const WIDTHS: { value: LineWidth; label: string }[] = [
  { value: 1, label: "Thin" },
  { value: 2, label: "Normal" },
  { value: 3, label: "Thick" },
];

const option = (selected: boolean) =>
  `rounded-md border px-2 py-0.5 ${
    selected
      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-200"
      : "border-zinc-300 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;

/** Colour, line type and thickness for one equation. */
function StylePicker({
  name,
  color,
  style,
  onChange,
}: {
  name: string;
  color: string;
  style: LineStyle;
  onChange: (change: LookChange) => void;
}) {
  return (
    <div role="group" aria-label={`Style of ${name}`} className="mt-1 ml-14 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Colour">
        {EQUATION_COLORS.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={`Colour ${i + 1}`}
            onClick={() => onChange({ color: c })}
            className={`size-5 rounded-full border-2 ${c === color ? "ring-2 ring-zinc-400 ring-offset-1 dark:ring-offset-zinc-900" : ""}`}
            style={{ background: c, borderColor: c }}
          />
        ))}
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label="Line type">
        {DASHES.map(({ value, label }) => (
          <button key={value} type="button" role="radio" aria-checked={style.dash === value} onClick={() => onChange({ dash: value })} className={option(style.dash === value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-1" role="radiogroup" aria-label="Thickness">
        {WIDTHS.map(({ value, label }) => (
          <button key={value} type="button" role="radio" aria-checked={style.width === value} onClick={() => onChange({ width: value })} className={option(style.width === value)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
