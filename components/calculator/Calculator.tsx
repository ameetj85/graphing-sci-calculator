"use client";

import { browser } from "react-dom";
import { use, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";
import { Tex } from "@/components/Tex";
import { EquationList } from "@/components/graph/EquationList";
import { Graph, type GraphCurve } from "@/components/graph/Graph";
import { EMPTY_EDITOR, editorReducer, type EditorAction, type EditorState } from "@/lib/calculator/editor";
import { addHistoryEntry, loadHistory, saveHistory, type HistoryEntry } from "@/lib/calculator/history";
import { KEYBOARD_TO_KEY, type KeyAction } from "@/lib/calculator/keys";
import {
  MAX_EQUATIONS,
  createEquation,
  decodeShareState,
  encodeShareState,
  equationName,
  type Equation,
} from "@/lib/graph/equations";
import {
  compileFunction,
  createScope,
  evaluateExpression,
  expressionToTex,
  type AngleMode,
  type CompileResult,
  type EvalResult,
  type Scope,
} from "@/lib/math/engine";
import { ExpressionInput } from "./ExpressionInput";
import { toExactForm } from "@/lib/math/exact";
import { ValueTable } from "@/components/graph/ValueTable";
import { HistoryPanel } from "./HistoryPanel";
import { Keypad } from "./Keypad";

const FLASH_MS = 120;
const EXPRESSION_FIELD = "expression";
const ANGLE_KEY = "gsc.angle.v1";
const DISPLAY_KEY = "gsc.display.v1";
const DEFAULT_EQUATIONS = ["sin(x)"];

type DisplayMode = "exact" | "decimal";

type Selection = { start: number; end: number };

function safeLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Initial state from the share URL, falling back to saved settings. Browser only. */
function loadInitialState() {
  const storage = safeLocalStorage();
  const shared = decodeShareState(window.location.search);
  const angleMode: AngleMode = shared.angleMode ?? (readSetting(storage, ANGLE_KEY) === "deg" ? "deg" : "rad");
  const displayMode: DisplayMode = readSetting(storage, DISPLAY_KEY) === "decimal" ? "decimal" : "exact";

  const equations: Equation[] = [];
  for (const [i, text] of (shared.equations ?? DEFAULT_EQUATIONS).entries()) {
    equations.push(createEquation(`e${i + 1}`, text, equations));
  }
  return { angleMode, displayMode, equations, history: loadHistory(storage) };
}

function readSetting(storage: Storage | undefined, key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null; // Storage blocked: use the default.
  }
}

function writeSetting(key: string, value: string) {
  try {
    safeLocalStorage()?.setItem(key, value);
  } catch {
    // Storage blocked: the setting lasts for this visit only.
  }
}

function isEditable(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function isInsideGraph(element: EventTarget | null): boolean {
  return element instanceof Element && element.closest(".MafsView") !== null;
}

export function Calculator() {
  // History, settings and shared graphs live in browser APIs, so this
  // component renders only in the browser; the page shows a fallback until then.
  use(browser("Reads saved history, settings and shared graph equations from this browser."));
  const [initial] = useState(loadInitialState);

  const scopeRef = useRef<Scope>(createScope());
  // Copy of the scope for the graph, replaced after each evaluation so curves
  // recompile when variables or functions change.
  const [graphScope, setGraphScope] = useState<Scope>(() => createScope());
  const [angleMode, setAngleMode] = useState<AngleMode>(initial.angleMode);

  const inputs = useRef(new Map<string, HTMLInputElement>());
  const [expression, dispatchExpression] = useReducer(editorReducer, EMPTY_EDITOR);
  const [activeField, setActiveField] = useState<string>(EXPRESSION_FIELD);

  const [equations, setEquations] = useState<Equation[]>(initial.equations);
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  const nextEquationId = useRef(initial.equations.length + 1);
  const [traceId, setTraceId] = useState<string | null>(null);
  // Shared by the graph's trace point and the value table.
  const [traceX, setTraceX] = useState(0);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initial.displayMode);
  const [showKeyPoints, setShowKeyPoints] = useState(true);
  const [copied, setCopied] = useState(false);
  const [xNoteDismissed, setXNoteDismissed] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>(initial.history);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [lastExpression, setLastExpression] = useState("");
  const [secondActive, setSecondActive] = useState(false);
  const [flashedKeyId, setFlashedKeyId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const previewTex = useMemo(() => expressionToTex(expression.value), [expression.value]);
  const exactForm = useMemo(() => (result?.ok ? toExactForm(result.value) : null), [result]);

  const compiled = useMemo(() => {
    const byId: Record<string, CompileResult> = {};
    for (const eq of equations) byId[eq.id] = compileFunction(eq.text, graphScope, angleMode);
    return byId;
  }, [equations, graphScope, angleMode]);

  const curves = useMemo<GraphCurve[]>(
    () =>
      equations.flatMap((eq, index) => {
        const compiledEq = compiled[eq.id];
        return eq.visible && compiledEq.ok
          ? [{ id: eq.id, name: equationName(index), fn: compiledEq.fn, color: eq.color }]
          : [];
      }),
    [equations, compiled],
  );

  // Keep the URL shareable and remember settings and history.
  useEffect(() => {
    const query = encodeShareState({ equations: equations.map((eq) => eq.text), angleMode });
    window.history.replaceState(window.history.state, "", query ? `?${query}` : window.location.pathname);
  }, [equations, angleMode]);

  useEffect(() => writeSetting(ANGLE_KEY, angleMode), [angleMode]);
  useEffect(() => writeSetting(DISPLAY_KEY, displayMode), [displayMode]);

  useEffect(() => saveHistory(safeLocalStorage(), history), [history]);

  // ----- Editing -----

  function editorFor(eq: Equation): EditorState {
    const selection = selections[eq.id] ?? { start: eq.text.length, end: eq.text.length };
    return { value: eq.text, ...selection };
  }

  function dispatchEquation(id: string, action: EditorAction) {
    const eq = equations.find((e) => e.id === id);
    if (!eq) return;
    const current = editorFor(eq);
    const next = editorReducer(current, action);
    if (next.value !== current.value) {
      setEquations((eqs) => eqs.map((e) => (e.id === id ? { ...e, text: next.value } : e)));
    }
    if (next.start !== current.start || next.end !== current.end) {
      setSelections((s) => ({ ...s, [id]: { start: next.start, end: next.end } }));
    }
  }

  function dispatchActive(action: EditorAction) {
    if (activeField === EXPRESSION_FIELD) dispatchExpression(action);
    else dispatchEquation(activeField, action);
  }

  function addEquation() {
    if (equations.length >= MAX_EQUATIONS) return;
    const id = `e${nextEquationId.current++}`;
    setEquations((eqs) => [...eqs, createEquation(id, "", eqs)]);
    setActiveField(id);
    // Focus once the new input has mounted.
    requestAnimationFrame(() => inputs.current.get(id)?.focus());
  }

  function removeEquation(id: string) {
    setEquations((eqs) => eqs.filter((eq) => eq.id !== id));
    if (activeField === id) setActiveField(EXPRESSION_FIELD);
    if (traceId === id) setTraceId(null);
  }

  function toggleEquation(id: string) {
    setEquations((eqs) => eqs.map((eq) => (eq.id === id ? { ...eq, visible: !eq.visible } : eq)));
  }

  function focusExpression(value: string, cursorAtEnd = true) {
    const position = cursorAtEnd ? value.length : 0;
    dispatchExpression({ type: "set", value, start: position, end: position });
    setActiveField(EXPRESSION_FIELD);
    inputs.current.get(EXPRESSION_FIELD)?.focus();
  }

  // ----- Evaluation -----

  function evaluate() {
    const source = expression.value;
    if (!source.trim()) return;
    const evaluated = evaluateExpression(source, scopeRef.current, angleMode);
    setResult(evaluated);
    setLastExpression(source);
    setGraphScope(new Map(scopeRef.current));
    if (evaluated.ok) {
      setHistory((entries) => addHistoryEntry(entries, { expression: source, result: evaluated.display, at: Date.now() }));
    }
  }

  /** Deletes the calculator variable `x`, which the graph cannot use anyway. */
  function removeCalculatorX() {
    scopeRef.current.delete("x");
    setGraphScope(new Map(scopeRef.current));
    setXNoteDismissed(false); // show the note again if x is redefined later
  }

  function runAction(action: KeyAction) {
    switch (action.type) {
      case "toggleSecond":
        setSecondActive((active) => !active);
        return;
      case "evaluate":
        // Graphs update live; "=" only evaluates the calculator expression.
        if (activeField === EXPRESSION_FIELD) evaluate();
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  }

  // Keyboard shortcuts that work anywhere on the page. While an input has
  // focus, typing is handled natively and this only highlights keypad keys.
  // Keys pressed on the graph are left to Mafs (arrow keys pan or trace).
  const onWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || isInsideGraph(event.target)) return;
    const keyId = KEYBOARD_TO_KEY[event.key];
    if (keyId) flash(keyId);

    const input = inputs.current.get(activeField);
    if (!input || isEditable(event.target)) return;
    const onButton = event.target instanceof HTMLButtonElement;

    if (event.key === "Enter") {
      if (onButton) return; // let Enter activate the focused button
      event.preventDefault();
      if (activeField === EXPRESSION_FIELD) evaluate();
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

  const registerInput = (id: string, element: HTMLInputElement | null) => {
    if (element) inputs.current.set(id, element);
    else inputs.current.delete(id);
  };

  const activeLabel =
    activeField === EXPRESSION_FIELD
      ? "the expression"
      : `${equationName(equations.findIndex((eq) => eq.id === activeField))}`;

  return (
    // Two rows on wide screens: calculator | graph, then history | value table.
    // The graph card stretches to the calculator card's height.
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:self-start dark:border-zinc-800 dark:bg-zinc-900">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              evaluate();
            }}
            className={`flex flex-col gap-2 rounded-xl p-1 ${
              activeField === EXPRESSION_FIELD ? "ring-2 ring-blue-500/40 dark:ring-blue-400/40" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <label htmlFor="expression" className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Expression
              </label>
              <Segmented
                label="Angle unit"
                options={[
                  { value: "deg", label: "DEG" },
                  { value: "rad", label: "RAD" },
                ]}
                value={angleMode}
                onChange={setAngleMode}
              />
            </div>
            <ExpressionInput
              id="expression"
              editor={expression}
              dispatch={dispatchExpression}
              registerInput={(element) => registerInput(EXPRESSION_FIELD, element)}
              onFocus={() => setActiveField(EXPRESSION_FIELD)}
              placeholder="e.g. sin(pi/4)^2 + sqrt(2)"
              autoFocus
            />
          </form>

          <div className="mt-3 min-h-12 overflow-x-auto text-zinc-700 dark:text-zinc-300" aria-label="Formatted input">
            {previewTex ? (
              <Tex tex={previewTex} display />
            ) : (
              <span className="text-sm text-zinc-400">Preview appears here</span>
            )}
          </div>

          <div className="mt-1 mb-4 min-h-16 border-t border-zinc-200 pt-3 dark:border-zinc-800" aria-live="polite">
            {result?.ok === true && (
              <div className="flex flex-col items-end gap-1">
                <div className="flex w-full items-center justify-between gap-2">
                  {exactForm ? (
                    <Segmented
                      label="Result format"
                      options={[
                        { value: "exact", label: "Exact" },
                        { value: "decimal", label: "Decimal" },
                      ]}
                      value={displayMode}
                      onChange={setDisplayMode}
                    />
                  ) : (
                    <span />
                  )}
                  <span className="min-w-0 truncate font-mono text-sm text-zinc-500">{lastExpression} =</span>
                </div>
                <span className="max-w-full overflow-x-auto text-2xl text-zinc-900 dark:text-zinc-50">
                  <Tex tex={exactForm && displayMode === "exact" ? exactForm.tex : result.tex} />
                </span>
                {exactForm && displayMode === "exact" && (
                  <span className="font-mono text-sm text-zinc-500">≈ {result.display}</span>
                )}
              </div>
            )}
            {result?.ok === false && (
              <p className="text-right text-sm text-red-600 dark:text-red-400">{result.error}</p>
            )}
          </div>

          <p className="mb-2 text-xs text-zinc-500">Keypad types into {activeLabel}.</p>
          <Keypad secondActive={secondActive} flashedKeyId={flashedKeyId} onKey={runAction} />

          <details className="mt-4 text-sm text-zinc-500">
            <summary className="cursor-pointer select-none">Keyboard shortcuts</summary>
            <ul className="mt-2 grid gap-1">
              <li><kbd>Enter</kbd> evaluate the expression</li>
              <li><kbd>Esc</kbd> clear the focused input</li>
              <li><kbd>Backspace</kbd> delete (the keypad removes a whole <code>sin(</code> at once)</li>
              <li>Type anywhere on the page to edit the last-used input</li>
              <li><kbd>^</kbd> power, <kbd>!</kbd> factorial, <code>pi</code>, <code>e</code>; <code>log</code> is ln, <code>log10</code> is base 10</li>
              <li>On the graph: drag or arrow keys to pan, scroll or pinch to zoom; arrow keys move a focused trace point</li>
            </ul>
          </details>
        </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <EquationList
          equations={equations}
          editorFor={editorFor}
          dispatchFor={(id) => (action) => dispatchEquation(id, action)}
          compiled={compiled}
          activeId={activeField === EXPRESSION_FIELD ? null : activeField}
          registerInput={registerInput}
          onFocus={setActiveField}
          onToggleVisible={toggleEquation}
          onRemove={removeEquation}
          onAdd={addEquation}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <label className="flex items-center gap-2">
            Trace
            <select
              value={traceId ?? ""}
              onChange={(event) => setTraceId(event.target.value || null)}
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">Off</option>
              {curves.map((curve) => (
                <option key={curve.id} value={curve.id}>
                  {curve.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showKeyPoints}
              onChange={(event) => setShowKeyPoints(event.target.checked)}
              className="size-4 accent-blue-600"
            />
            Roots &amp; intersections
          </label>
          <span className="text-xs text-zinc-400">{angleMode === "deg" ? "x in degrees" : "x in radians"}</span>
          <button
            type="button"
            onClick={copyLink}
            className="ml-auto rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {copied ? "Link copied" : "Copy link to graph"}
          </button>
        </div>

        {graphScope.has("x") && !xNoteDismissed && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="flex-1">
              In the graph, <code>x</code> is the horizontal axis, so the calculator&apos;s <code>x</code> isn&apos;t used here.
              To evaluate at a specific x, type the function (for example <code>cos(x)</code>) in the Expression input.
              Other variables, such as <code>a</code> in <code>a cos(x)</code>, do apply to the graph.
            </p>
            <button
              type="button"
              onClick={removeCalculatorX}
              className="shrink-0 rounded-md border border-amber-300 px-2 py-0.5 font-medium hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/50"
            >
              Remove x
            </button>
            <button
              type="button"
              onClick={() => setXNoteDismissed(true)}
              aria-label="Dismiss note"
              className="shrink-0 rounded-md px-1.5 text-base leading-none hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              ×
            </button>
          </div>
        )}

        {/* The graph fills whatever height is left, measured by Graph itself. */}
        <div className="relative min-h-[22rem] flex-1">
          <div className="absolute inset-0">
            <Graph
              curves={curves}
              traceId={traceId}
              traceX={traceX}
              onTraceMove={setTraceX}
              showKeyPoints={showKeyPoints}
              angleMode={angleMode}
            />
          </div>
        </div>
        {showKeyPoints && curves.length > 0 && (
          <p className="text-xs text-zinc-500">Hover a dot to see a root or intersection; click it to pin its coordinates.</p>
        )}
      </section>

      <div className="lg:self-start">
        <HistoryPanel
          entries={history}
          onUseExpression={(text) => focusExpression(text)}
          onInsertResult={(text) => {
            setActiveField(EXPRESSION_FIELD);
            dispatchExpression({ type: "insert", text });
            inputs.current.get(EXPRESSION_FIELD)?.focus();
          }}
          onClear={() => setHistory([])}
        />
      </div>

      <div className="lg:self-start">
        <ValueTable
          curves={curves}
          angleMode={angleMode}
          traceX={traceId ? traceX : null}
          onSelectX={(x) => {
            setTraceX(x);
            if (!traceId && curves.length > 0) setTraceId(curves[0].id);
          }}
        />
      </div>
    </div>
  );
}

type SegmentedProps<T extends string> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

function Segmented<T extends string>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-semibold dark:bg-zinc-800">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            value === option.value
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-white"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
