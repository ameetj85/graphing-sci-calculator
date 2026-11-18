"use client";

import { useLayoutEffect, useRef, type Dispatch, type KeyboardEvent } from "react";
import type { EditorAction, EditorState } from "@/lib/calculator/editor";

type ExpressionInputProps = {
  id: string;
  editor: EditorState;
  dispatch: Dispatch<EditorAction>;
  /** Receives the input element so the parent can focus it. */
  registerInput?: (element: HTMLInputElement | null) => void;
  onFocus?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
  className?: string;
};

/**
 * Text input bound to an editor reducer. The editor state is the source of
 * truth for both the text and the selection, so keypad presses can edit at the
 * cursor even while the input itself does not have focus.
 */
export function ExpressionInput({
  id,
  editor,
  dispatch,
  registerInput,
  onFocus,
  onKeyDown,
  placeholder,
  autoFocus,
  ariaLabel,
  className = "",
}: ExpressionInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Mirror the editor's selection into the input while it has focus.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) input.setSelectionRange(editor.start, editor.end);
  }, [editor]);

  return (
    <input
      id={id}
      ref={(element) => {
        inputRef.current = element;
        registerInput?.(element);
      }}
      value={editor.value}
      aria-label={ariaLabel}
      onFocus={onFocus}
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
        onKeyDown?.(event);
      }}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      autoFocus={autoFocus}
      className={`w-full min-w-0 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 font-mono text-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-950 ${className}`}
    />
  );
}
