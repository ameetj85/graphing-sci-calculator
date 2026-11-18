"use client";

import type { Dispatch } from "react";
import { ExpressionInput } from "@/components/calculator/ExpressionInput";
import type { EditorAction, EditorState } from "@/lib/calculator/editor";
import { MAX_EQUATIONS, equationName, type Equation } from "@/lib/graph/equations";
import type { CompileResult } from "@/lib/math/engine";

type EquationListProps = {
  equations: Equation[];
  editorFor: (equation: Equation) => EditorState;
  dispatchFor: (id: string) => Dispatch<EditorAction>;
  compiled: Record<string, CompileResult>;
  activeId: string | null;
  registerInput: (id: string, element: HTMLInputElement | null) => void;
  onFocus: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
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
}: EquationListProps) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {equations.map((equation, index) => {
          const name = equationName(index);
          const result = compiled[equation.id];
          const error = equation.text.trim() && result && !result.ok ? result.error : null;
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
                <label htmlFor={`eq-${equation.id}`} className="shrink-0 font-mono text-zinc-600 dark:text-zinc-400">
                  {name} =
                </label>
                <ExpressionInput
                  id={`eq-${equation.id}`}
                  editor={editorFor(equation)}
                  dispatch={dispatchFor(equation.id)}
                  registerInput={(element) => registerInput(equation.id, element)}
                  onFocus={() => onFocus(equation.id)}
                  placeholder="a function of x"
                  className={equation.visible ? "" : "opacity-60"}
                />
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
              {error && <p className="mt-0.5 ml-16 text-xs text-red-600 dark:text-red-400">{error}</p>}
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
