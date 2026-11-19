"use client";

import { browser } from "react-dom";
import { use, useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from "react";
import { Tex } from "@/components/Tex";
import { EquationList } from "@/components/graph/EquationList";
import { Graph, type GraphCurve, type GraphShape } from "@/components/graph/Graph";
import { SurfaceView, type GraphSurface } from "@/components/graph/SurfaceView";
import { snapshotScope } from "@/lib/graph/scopeSnapshot";
import { compilePlot, type PlotResult } from "@/lib/graph/plotSpec";
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
  type GraphView,
} from "@/lib/graph/equations";
import {
  createScope,
  evaluateExpression,
  expressionToTex,
  formatValue,
  type AngleMode,
  type EvalResult,
  type Scope,
} from "@/lib/math/engine";
import { ExpressionInput } from "./ExpressionInput";
import { toExactForm } from "@/lib/math/exact";
import { ValueTable } from "@/components/graph/ValueTable";
import { MatrixPanel } from "@/components/tools/MatrixPanel";
import { StatsPanel } from "@/components/tools/StatsPanel";
import { ToolsPanel } from "@/components/tools/ToolsPanel";
import { UnitsPanel } from "@/components/tools/UnitsPanel";
import { VariablesPanel } from "@/components/tools/VariablesPanel";
import { ProgramsPanel, type ProgramRun } from "@/components/tools/ProgramsPanel";
import { captureOutput, registerPrograms, runProgram, type Program } from "@/lib/script/interpreter";
import { loadPrograms, savePrograms, validateProgram } from "@/lib/script/programs";
import {
  DATA_KEY,
  MATRICES_KEY,
  WORKSPACE_VARIABLES,
  loadData,
  loadMatrices,
  workspaceVariables,
  writeJson,
  type DataLists,
  type Matrices,
} from "@/lib/calculator/workspace";
import type { Point } from "@/lib/graph/sample";
import { parseList } from "@/lib/stats/stats";
import { HistoryPanel } from "./HistoryPanel";
import { Keypad } from "./Keypad";

const FLASH_MS = 120;
const EXPRESSION_FIELD = "expression";
const ANGLE_KEY = "gsc.angle.v1";
const DISPLAY_KEY = "gsc.display.v1";
const DEFAULT_EQUATIONS = ["sin(x)"];

type DisplayMode = "exact" | "decimal";

const ANGLE_NAMES: Record<AngleMode, string> = { deg: "degrees", rad: "radians", grad: "gradians" };

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
  const savedAngle = readSetting(storage, ANGLE_KEY);
  const angleMode: AngleMode = shared.angleMode ?? (savedAngle === "deg" || savedAngle === "grad" ? savedAngle : "rad");
  const displayMode: DisplayMode = readSetting(storage, DISPLAY_KEY) === "decimal" ? "decimal" : "exact";

  const equations: Equation[] = [];
  for (const [i, text] of (shared.equations ?? DEFAULT_EQUATIONS).entries()) {
    equations.push(createEquation(`e${i + 1}`, text, equations));
  }
  return {
    angleMode,
    view: shared.view ?? "2d",
    displayMode,
    equations,
    history: loadHistory(storage),
    data: loadData(storage),
    matrices: loadMatrices(storage),
    programs: loadPrograms(storage),
  };
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

  // The calculator scope starts with the saved data lists (L1, L2) and matrices.
  const [initialScope] = useState<Scope>(() => {
    const scope = createScope();
    for (const [name, value] of workspaceVariables(initial.data, initial.matrices)) scope.set(name, value);
    // Saved programs are callable from expressions and graphs.
    registerPrograms(scope, initial.programs, initial.angleMode);
    return scope;
  });
  const scopeRef = useRef<Scope>(initialScope);
  // Copy of the scope for the graph, replaced after each evaluation so curves
  // recompile when variables or functions change.
  const [graphScope, setGraphScope] = useState<Scope>(() => new Map(initialScope));
  const [data, setData] = useState<DataLists>(initial.data);
  const [matrices, setMatrices] = useState<Matrices>(initial.matrices);
  const [plotData, setPlotData] = useState(false);
  const [angleMode, setAngleMode] = useState<AngleMode>(initial.angleMode);
  const [view, setView] = useState<GraphView>(initial.view);
  const [programs, setPrograms] = useState<Program[]>(initial.programs);

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
  // Lines printed by programs that the last expression called.
  const [printed, setPrinted] = useState<string[]>([]);
  const [lastExpression, setLastExpression] = useState("");
  const [secondActive, setSecondActive] = useState(false);
  const [flashedKeyId, setFlashedKeyId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const previewTex = useMemo(() => expressionToTex(expression.value), [expression.value]);
  const exactForm = useMemo(() => (result?.ok ? toExactForm(result.value) : null), [result]);

  // Plain-data copy of the scope for the plotting worker.
  const snapshot = useMemo(() => snapshotScope(graphScope), [graphScope]);

  const compiled = useMemo(() => {
    const byId: Record<string, PlotResult> = {};
    for (const eq of equations) byId[eq.id] = compilePlot(eq.text, graphScope, angleMode);
    return byId;
  }, [equations, graphScope, angleMode]);

  // y = f(x) curves (traceable, tabulated) and other shapes, visible ones only.
  const { curves, shapes, surfaces } = useMemo(() => {
    const curves: GraphCurve[] = [];
    const shapes: GraphShape[] = [];
    const surfaces: GraphSurface[] = [];
    equations.forEach((eq, index) => {
      const result = compiled[eq.id];
      if (!eq.visible || !result.ok) return;
      const { spec } = result;
      if (spec.kind === "function") curves.push({ id: eq.id, name: equationName(index), fn: spec.fn, source: spec.source, color: eq.color });
      else if (spec.kind === "inequality") shapes.push({ id: eq.id, color: eq.color, kind: "inequality", fn: spec.fn, op: spec.op });
      else if (spec.kind === "implicit") shapes.push({ id: eq.id, color: eq.color, kind: "implicit", source: spec.source });
      else if (spec.kind === "surface") surfaces.push({ id: eq.id, name: equationName(index), source: spec.source, color: eq.color });
      else shapes.push({ id: eq.id, color: eq.color, kind: "curve", xy: spec.xy, tMin: spec.tMin, tMax: spec.tMax });
    });
    if (plotData) {
      const xs = parseList(data.l1).values;
      const ys = parseList(data.l2).values;
      const points = xs.slice(0, ys.length).map((x, i): Point => [x, ys[i]]);
      if (points.length) shapes.push({ id: "data", color: "var(--mafs-orange)", kind: "points", points });
    }
    return { curves, shapes, surfaces };
  }, [equations, compiled, plotData, data]);

  // Keep the URL shareable and remember settings and history.
  useEffect(() => {
    const query = encodeShareState({ equations: equations.map((eq) => eq.text), angleMode, view });
    window.history.replaceState(window.history.state, "", query ? `?${query}` : window.location.pathname);
  }, [equations, angleMode, view]);

  useEffect(() => writeSetting(ANGLE_KEY, angleMode), [angleMode]);
  useEffect(() => writeSetting(DISPLAY_KEY, displayMode), [displayMode]);

  useEffect(() => saveHistory(safeLocalStorage(), history), [history]);
  useEffect(() => writeJson(safeLocalStorage(), DATA_KEY, data), [data]);
  useEffect(() => writeJson(safeLocalStorage(), MATRICES_KEY, matrices), [matrices]);
  useEffect(() => savePrograms(safeLocalStorage(), programs), [programs]);

  /** Re-registers program functions in the scope (programs or angle mode changed). */
  function syncPrograms(nextPrograms: Program[], mode: AngleMode) {
    registerPrograms(scopeRef.current, nextPrograms, mode);
    setGraphScope(new Map(scopeRef.current));
  }

  function changeAngleMode(mode: AngleMode) {
    setAngleMode(mode);
    syncPrograms(programs, mode);
  }

  function saveProgram(program: Program): string | null {
    const others = programs.filter((p) => p.id !== program.id);
    const error = validateProgram(program, others);
    if (error) return error;
    const exists = others.length < programs.length;
    const next = exists ? programs.map((p) => (p.id === program.id ? program : p)) : [...programs, program];
    setPrograms(next);
    syncPrograms(next, angleMode);
    return null;
  }

  function deleteProgram(id: string) {
    const next = programs.filter((p) => p.id !== id);
    setPrograms(next);
    syncPrograms(next, angleMode);
  }

  /** Runs a program from the Programs tab; a returned value becomes ans and goes into history. */
  function runSavedProgram(program: Program, argTexts: string[]): ProgramRun {
    const args: unknown[] = [];
    for (const [i, text] of argTexts.entries()) {
      if (!text.trim()) return { ok: false, error: `Enter a value for ${program.params[i]} in the Run row`, output: [] };
      // Arguments are evaluated in a copy so they don't change ans.
      const arg = evaluateExpression(text, new Map(scopeRef.current), angleMode);
      if (!arg.ok) return { ok: false, error: `${program.params[i]}: ${arg.error}`, output: [] };
      args.push(arg.value);
    }
    const run = runProgram(program, args, scopeRef.current, angleMode);
    if (!run.ok) return run;
    if (run.value === undefined) return { ok: true, value: null, output: run.output };

    const display = formatValue(run.value);
    scopeRef.current.set("ans", run.value);
    setGraphScope(new Map(scopeRef.current));
    const call = `${program.name}(${argTexts.map((t) => t.trim()).join(", ")})`;
    setHistory((entries) => addHistoryEntry(entries, { expression: call, result: display, at: Date.now() }));
    return { ok: true, value: display, output: run.output };
  }

  /** Replaces the data lists and matrices, and the variables they define. */
  function updateWorkspace(nextData: DataLists, nextMatrices: Matrices) {
    setData(nextData);
    setMatrices(nextMatrices);
    const scope = scopeRef.current;
    for (const name of WORKSPACE_VARIABLES) scope.delete(name);
    for (const [name, value] of workspaceVariables(nextData, nextMatrices)) scope.set(name, value);
    setGraphScope(new Map(scope));
  }

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

  /** Inserts text at the expression cursor and focuses the expression input. */
  function insertIntoExpression(text: string) {
    setActiveField(EXPRESSION_FIELD);
    dispatchExpression({ type: "insert", text });
    inputs.current.get(EXPRESSION_FIELD)?.focus();
  }

  /** Adds an equation row; an empty one is focused for typing. Returns false at the limit. */
  function addEquation(text = ""): boolean {
    if (equations.length >= MAX_EQUATIONS) return false;
    const id = `e${nextEquationId.current++}`;
    setEquations((eqs) => [...eqs, createEquation(id, text, eqs)]);
    if (!text) {
      setActiveField(id);
      // Focus once the new input has mounted.
      requestAnimationFrame(() => inputs.current.get(id)?.focus());
    }
    return true;
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
    const { value: evaluated, output } = captureOutput(() => evaluateExpression(source, scopeRef.current, angleMode));
    setResult(evaluated);
    setPrinted(output);
    setLastExpression(source);
    setGraphScope(new Map(scopeRef.current));
    if (evaluated.ok) {
      setHistory((entries) => addHistoryEntry(entries, { expression: source, result: evaluated.display, at: Date.now() }));
    }
  }

  /** Deletes a user variable or function from the calculator scope. */
  function deleteVariable(name: string) {
    scopeRef.current.delete(name);
    setGraphScope(new Map(scopeRef.current));
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
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
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
                  { value: "grad", label: "GRAD" },
                ]}
                value={angleMode}
                onChange={changeAngleMode}
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
            {printed.length > 0 && (
              <pre
                aria-label="Printed output"
                className="mb-2 max-h-32 overflow-auto rounded-lg bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400"
              >
                {printed.join("\n")}
              </pre>
            )}
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
          onAdd={() => addEquation()}
          view={view}
          onShow3D={() => setView("3d")}
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <Segmented
            label="Graph view"
            options={[
              { value: "2d", label: "2D" },
              { value: "3d", label: "3D" },
            ]}
            value={view}
            onChange={setView}
          />
          {view === "2d" && (
            <>
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
            </>
          )}
          <span className="text-xs text-zinc-400">x in {ANGLE_NAMES[angleMode]}</span>
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
            {view === "3d" ? (
              <SurfaceView
                key={angleMode}
                surfaces={surfaces}
                scope={graphScope}
                snapshot={snapshot}
                angleMode={angleMode}
              />
            ) : (
              <Graph
                curves={curves}
                shapes={shapes}
                traceId={traceId}
                traceX={traceX}
                onTraceMove={setTraceX}
                showKeyPoints={showKeyPoints}
                angleMode={angleMode}
                scope={graphScope}
                snapshot={snapshot}
              />
            )}
          </div>
        </div>
        {view === "2d" && showKeyPoints && curves.length > 0 && (
          <p className="text-xs text-zinc-500">Hover a dot to see a root or intersection; click it to pin its coordinates.</p>
        )}
      </section>

      <div className="lg:self-start">
        <HistoryPanel
          entries={history}
          onUseExpression={(text) => focusExpression(text)}
          onInsertResult={insertIntoExpression}
          onClear={() => setHistory([])}
        />
      </div>

      <div className="lg:self-start">
        <ToolsPanel
          tabs={[
            {
              id: "table",
              label: "Table",
              content: (
                <ValueTable
                  curves={curves}
                  angleMode={angleMode}
                  traceX={traceId ? traceX : null}
                  onSelectX={(x) => {
                    setTraceX(x);
                    if (!traceId && curves.length > 0) setTraceId(curves[0].id);
                  }}
                />
              ),
            },
            {
              id: "stats",
              label: "Statistics",
              content: (
                <StatsPanel
                  data={data}
                  onDataChange={(next) => updateWorkspace(next, matrices)}
                  plotData={plotData}
                  onPlotDataChange={setPlotData}
                  onGraphFit={(fitExpression) =>
                    addEquation(fitExpression) ? null : `Remove an equation first (the limit is ${MAX_EQUATIONS})`
                  }
                />
              ),
            },
            {
              id: "matrices",
              label: "Matrices",
              content: (
                <MatrixPanel
                  matrices={matrices}
                  onSave={(name, matrix) => updateWorkspace(data, { ...matrices, [name]: matrix })}
                  onDelete={(name) => {
                    const rest = Object.fromEntries(Object.entries(matrices).filter(([key]) => key !== name));
                    updateWorkspace(data, rest);
                  }}
                  onInsert={insertIntoExpression}
                />
              ),
            },
            {
              id: "units",
              label: "Units",
              content: <UnitsPanel onInsert={insertIntoExpression} />,
            },
            {
              id: "variables",
              label: "Variables",
              content: <VariablesPanel scope={graphScope} onInsert={insertIntoExpression} onDelete={deleteVariable} />,
            },
            {
              id: "programs",
              label: "Programs",
              content: (
                <ProgramsPanel
                  programs={programs}
                  angleMode={angleMode}
                  onSave={saveProgram}
                  onDelete={deleteProgram}
                  onRun={runSavedProgram}
                  onInsert={insertIntoExpression}
                />
              ),
            },
          ]}
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
