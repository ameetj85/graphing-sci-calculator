"use client";

import { useMemo, useRef, useState } from "react";
import { Tex } from "@/components/Tex";
import { createScope, evaluateExpression, expressionToTex, type EvalResult } from "@/lib/math/engine";

export function Calculator() {
  const scopeRef = useRef(createScope());
  const [input, setInput] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [lastExpression, setLastExpression] = useState("");

  const previewTex = useMemo(() => expressionToTex(input), [input]);

  function evaluate() {
    if (!input.trim()) return;
    setResult(evaluateExpression(input, scopeRef.current));
    setLastExpression(input);
  }

  return (
    <section className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          evaluate();
        }}
        className="flex flex-col gap-3"
      >
        <label htmlFor="expression" className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Expression
        </label>
        <div className="flex gap-2">
          <input
            id="expression"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. sin(pi/4)^2 + sqrt(2)"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            autoFocus
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 active:bg-blue-800"
          >
            =
          </button>
        </div>
      </form>

      <div className="mt-4 min-h-12 overflow-x-auto text-zinc-700 dark:text-zinc-300" aria-label="Formatted input">
        {previewTex ? <Tex tex={previewTex} display /> : <span className="text-sm text-zinc-400">Preview appears here</span>}
      </div>

      <div className="mt-2 min-h-16 border-t border-zinc-200 pt-3 dark:border-zinc-800" aria-live="polite">
        {result?.ok === true && (
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-sm text-zinc-500">{lastExpression} =</span>
            <span className="overflow-x-auto text-2xl text-zinc-900 dark:text-zinc-50">
              <Tex tex={result.tex} />
            </span>
          </div>
        )}
        {result?.ok === false && <p className="text-right text-sm text-red-600 dark:text-red-400">{result.error}</p>}
      </div>
    </section>
  );
}
