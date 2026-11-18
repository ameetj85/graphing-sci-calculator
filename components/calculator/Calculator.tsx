"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { Tex } from "@/components/Tex";
import { EMPTY_EDITOR, editorReducer } from "@/lib/calculator/editor";
import { KEYBOARD_TO_KEY, type KeyAction } from "@/lib/calculator/keys";
import { createScope, evaluateExpression, expressionToTex, type EvalResult } from "@/lib/math/engine";
import { Keypad } from "./Keypad";

const FLASH_MS = 120;

function isEditable(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

export function Calculator() {
  const scopeRef = useRef(createScope());
  const inputRef = useRef<HTMLInputElement>(null);
  const [editor, dispatch] = useReducer(editorReducer, EMPTY_EDITOR);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [lastExpression, setLastExpression] = useState("");
  const [secondActive, setSecondActive] = useState(false);
  const [flashedKeyId, setFlashedKeyId] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const previewTex = useMemo(() => expressionToTex(editor.value), [editor.value]);

  // Mirror the editor's selection into the input while it has focus.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) input.setSelectionRange(editor.start, editor.end);
  }, [editor]);

  function evaluate() {
    if (!editor.value.trim()) return;
    setResult(evaluateExpression(editor.value, scopeRef.current));
    setLastExpression(editor.value);
  }

  function runAction(action: KeyAction) {
    switch (action.type) {
      case "toggleSecond":
        setSecondActive((active) => !active);
        return;
      case "evaluate":
        evaluate();
        break;
      default:
        dispatch(action);
    }
    setSecondActive(false);
  }

  function flash(keyId: string) {
    clearTimeout(flashTimer.current);
    setFlashedKeyId(keyId);
    flashTimer.current = setTimeout(() => setFlashedKeyId(null), FLASH_MS);
  }

  // Keyboard shortcuts that work anywhere on the page. While the input has
  // focus, typing is handled natively and this only highlights keypad keys.
  const onWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const keyId = KEYBOARD_TO_KEY[event.key];
    if (keyId) flash(keyId);

    const input = inputRef.current;
    if (!input || isEditable(event.target)) return;
    const onButton = event.target instanceof HTMLButtonElement;

    if (event.key === "Enter") {
      if (onButton) return; // let Enter activate the focused button
      event.preventDefault();
      evaluate();
    } else if (event.key === "Escape") {
      dispatch({ type: "clear" });
    } else if (event.key === "Backspace") {
      event.preventDefault();
      dispatch({ type: "backspace" });
    } else if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      input.focus();
      dispatch({ type: "insert", text: event.key });
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
      clearTimeout(flashTimer.current);
    };
  }, []);

  return (
    <section className="w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          evaluate();
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="expression" className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Expression
        </label>
        <input
          id="expression"
          ref={inputRef}
          value={editor.value}
          onChange={(event) =>
            dispatch({
              type: "set",
              value: event.target.value,
              start: event.target.selectionStart ?? event.target.value.length,
              end: event.target.selectionEnd ?? event.target.value.length,
            })
          }
          onSelect={(event) =>
            dispatch({
              type: "select",
              start: event.currentTarget.selectionStart ?? 0,
              end: event.currentTarget.selectionEnd ?? 0,
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              dispatch({ type: "clear" });
            }
          }}
          placeholder="e.g. sin(pi/4)^2 + sqrt(2)"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus
          className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-950"
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

      <Keypad secondActive={secondActive} flashedKeyId={flashedKeyId} onKey={runAction} />

      <details className="mt-4 text-sm text-zinc-500">
        <summary className="cursor-pointer select-none">Keyboard shortcuts</summary>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          <li><kbd>Enter</kbd> evaluate</li>
          <li><kbd>Esc</kbd> clear the input</li>
          <li><kbd>Backspace</kbd> delete (removes a whole <code>sin(</code> at once from the keypad)</li>
          <li>Type anywhere on the page to start entering an expression</li>
          <li><kbd>^</kbd> power, <kbd>!</kbd> factorial, <code>pi</code>, <code>e</code></li>
          <li><code>log</code> is ln; <code>log10</code> is base 10</li>
        </ul>
      </details>
    </section>
  );
}
