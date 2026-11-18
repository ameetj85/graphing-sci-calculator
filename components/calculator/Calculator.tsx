"use client";

import { useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";
import { Tex } from "@/components/Tex";
import { Graph } from "@/components/graph/Graph";
import { EMPTY_EDITOR, editorReducer } from "@/lib/calculator/editor";
import { KEYBOARD_TO_KEY, type KeyAction } from "@/lib/calculator/keys";
import {
  compileFunction,
  createScope,
  evaluateExpression,
  expressionToTex,
  type EvalResult,
  type Scope,
} from "@/lib/math/engine";
import { ExpressionInput } from "./ExpressionInput";
import { Keypad } from "./Keypad";

const FLASH_MS = 120;

type Field = "expression" | "graph";

function isEditable(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function isInsideGraph(element: EventTarget | null): boolean {
  return element instanceof Element && element.closest(".MafsView") !== null;
}

export function Calculator() {
  const scopeRef = useRef(createScope());
  // Copy of the scope for the graph, replaced after each evaluation so the
  // graph recompiles when variables or functions change.
  const [graphScope, setGraphScope] = useState<Scope>(() => createScope());

  const expressionRef = useRef<HTMLInputElement>(null);
  const graphInputRef = useRef<HTMLInputElement>(null);
  const [expression, dispatchExpression] = useReducer(editorReducer, EMPTY_EDITOR);
  const [graphEquation, dispatchGraph] = useReducer(editorReducer, { value: "sin(x)", start: 6, end: 6 });
  const [activeField, setActiveField] = useState<Field>("expression");

  const [result, setResult] = useState<EvalResult | null>(null);
  const [lastExpression, setLastExpression] = useState("");
  const [secondActive, setSecondActive] = useState(false);
  const [flashedKeyId, setFlashedKeyId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const previewTex = useMemo(() => expressionToTex(expression.value), [expression.value]);
  const compiled = useMemo(() => compileFunction(graphEquation.value, graphScope), [graphEquation.value, graphScope]);

  const dispatchActive = activeField === "graph" ? dispatchGraph : dispatchExpression;
  const activeInputRef = activeField === "graph" ? graphInputRef : expressionRef;

  function evaluate() {
    if (!expression.value.trim()) return;
    setResult(evaluateExpression(expression.value, scopeRef.current));
    setLastExpression(expression.value);
    setGraphScope(new Map(scopeRef.current));
  }

  function runAction(action: KeyAction) {
    switch (action.type) {
      case "toggleSecond":
        setSecondActive((active) => !active);
        return;
      case "evaluate":
        // The graph updates live; "=" only evaluates the calculator input.
        if (activeField === "expression") evaluate();
        break;
      default:
        dispatchActive(action);
    }
    setSecondActive(false);
  }

  function flash(keyId: string) {
    clearTimeout(flashTimer.current);
    setFlashedKeyId(keyId);
    flashTimer.current = setTimeout(() => setFlashedKeyId(null), FLASH_MS);
  }

  // Keyboard shortcuts that work anywhere on the page. While an input has
  // focus, typing is handled natively and this only highlights keypad keys.
  // Keys pressed on the graph are left to Mafs (arrow keys pan it).
  const onWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || isInsideGraph(event.target)) return;
    const keyId = KEYBOARD_TO_KEY[event.key];
    if (keyId) flash(keyId);

    const input = activeInputRef.current;
    if (!input || isEditable(event.target)) return;
    const onButton = event.target instanceof HTMLButtonElement;

    if (event.key === "Enter") {
      if (onButton) return; // let Enter activate the focused button
      event.preventDefault();
      if (activeField === "expression") evaluate();
    } else if (event.key === "Escape") {
      dispatchActive({ type: "clear" });
    } else if (event.key === "Backspace") {
      event.preventDefault();
      dispatchActive({ type: "backspace" });
    } else if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      input.focus();
      dispatchActive({ type: "insert", text: event.key });
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      clearTimeout(flashTimer.current);
    };
  }, []);

  const fieldRing = (field: Field) =>
    activeField === field ? "ring-2 ring-blue-500/40 dark:ring-blue-400/40" : "";

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            evaluate();
          }}
          className={`flex flex-col gap-2 rounded-xl p-1 ${fieldRing("expression")}`}
        >
          <label htmlFor="expression" className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Expression
          </label>
          <ExpressionInput
            id="expression"
            inputRef={expressionRef}
            editor={expression}
            dispatch={dispatchExpression}
            onFocus={() => setActiveField("expression")}
            placeholder="e.g. sin(pi/4)^2 + sqrt(2)"
            autoFocus
          />
        </form>

        <div className="mt-3 min-h-12 overflow-x-auto text-zinc-700 dark:text-zinc-300" aria-label="Formatted input">
          {previewTex ? <Tex tex={previewTex} display /> : <span className="text-sm text-zinc-400">Preview appears here</span>}
        </div>

        <div className="mt-1 mb-4 min-h-16 border-t border-zinc-200 pt-3 dark:border-zinc-800" aria-live="polite">
          {result?.ok === true && (
            <div className="flex flex-col items-end gap-1">
              <span className="max-w-full truncate font-mono text-sm text-zinc-500">{lastExpression} =</span>
              <span className="max-w-full overflow-x-auto text-2xl text-zinc-900 dark:text-zinc-50">
                <Tex tex={result.tex} />
              </span>
            </div>
          )}
          {result?.ok === false && <p className="text-right text-sm text-red-600 dark:text-red-400">{result.error}</p>}
        </div>

        <p className="mb-2 text-xs text-zinc-500">
          Keypad types into the {activeField === "graph" ? "graph equation" : "expression"}.
        </p>
        <Keypad secondActive={secondActive} flashedKeyId={flashedKeyId} onKey={runAction} />

        <details className="mt-4 text-sm text-zinc-500">
          <summary className="cursor-pointer select-none">Keyboard shortcuts</summary>
          <ul className="mt-2 grid gap-1">
            <li><kbd>Enter</kbd> evaluate the expression</li>
            <li><kbd>Esc</kbd> clear the focused input</li>
            <li><kbd>Backspace</kbd> delete (the keypad removes a whole <code>sin(</code> at once)</li>
            <li>Type anywhere on the page to edit the last-used input</li>
            <li><kbd>^</kbd> power, <kbd>!</kbd> factorial, <code>pi</code>, <code>e</code>; <code>log</code> is ln, <code>log10</code> is base 10</li>
            <li>On the graph: drag or arrow keys to pan, scroll or pinch to zoom</li>
          </ul>
        </details>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className={`flex items-center gap-2 rounded-xl p-1 ${fieldRing("graph")}`}>
          <label htmlFor="graph-equation" className="shrink-0 font-mono text-lg text-zinc-600 dark:text-zinc-400">
            y =
          </label>
          <ExpressionInput
            id="graph-equation"
            inputRef={graphInputRef}
            editor={graphEquation}
            dispatch={dispatchGraph}
            onFocus={() => setActiveField("graph")}
            placeholder="a function of x, e.g. x^2 - 2"
          />
        </div>
        <div className="min-h-8 overflow-x-auto text-zinc-700 dark:text-zinc-300" aria-live="polite">
          {compiled.ok ? (
            <Tex tex={compiled.tex} />
          ) : graphEquation.value.trim() ? (
            <p className="text-sm text-red-600 dark:text-red-400">{compiled.error}</p>
          ) : (
            <span className="text-sm text-zinc-400">Enter a function of x to graph it</span>
          )}
        </div>
        <Graph fn={compiled.ok ? compiled.fn : null} />
      </section>
    </div>
  );
}
