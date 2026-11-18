/**
 * Pure editing logic for the expression input. The keypad and keyboard
 * shortcuts dispatch actions here; the input element mirrors `value` and the
 * selection range (`start`..`end`).
 */
export type EditorState = {
  value: string;
  start: number;
  end: number;
};

export type EditorAction =
  | { type: "set"; value: string; start: number; end: number }
  | { type: "select"; start: number; end: number }
  | { type: "insert"; text: string }
  | { type: "wrap"; name: string }
  | { type: "backspace" }
  | { type: "clear" };

export const EMPTY_EDITOR: EditorState = { value: "", start: 0, end: 0 };

const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max);

function normalize(state: EditorState): EditorState {
  const max = state.value.length;
  const a = clamp(state.start, max);
  const b = clamp(state.end, max);
  return { value: state.value, start: Math.min(a, b), end: Math.max(a, b) };
}

/** Replaces the selection with `text` and puts the cursor at `cursorOffset` within it. */
function replaceSelection(state: EditorState, text: string, cursorOffset = text.length): EditorState {
  const value = state.value.slice(0, state.start) + text + state.value.slice(state.end);
  const cursor = state.start + cursorOffset;
  return { value, start: cursor, end: cursor };
}

function backspace(state: EditorState): EditorState {
  if (state.start !== state.end) return replaceSelection(state, "");
  if (state.start === 0) return state;

  const { value, start } = state;
  let from = start - 1;
  const to = start;

  if (value[from] !== "(") {
    return { value: value.slice(0, from) + value.slice(to), start: from, end: from };
  }

  // Delete a whole function opener such as `sin(` in one step, together with
  // its matching closing parenthesis so the expression stays balanced.
  const name = value.slice(0, from).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0];
  if (name) from -= name.length;
  const close = findMatchingClose(value, to);
  const rest = close === -1 ? value.slice(to) : value.slice(to, close) + value.slice(close + 1);
  return { value: value.slice(0, from) + rest, start: from, end: from };
}

/** Index of the `)` closing a `(` that ends just before `index`, or -1. */
function findMatchingClose(value: string, index: number): number {
  let depth = 0;
  for (let i = index; i < value.length; i++) {
    if (value[i] === "(") depth++;
    else if (value[i] === ")") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "set":
      return normalize({ value: action.value, start: action.start, end: action.end });
    case "select": {
      const next = normalize({ ...state, start: action.start, end: action.end });
      return next.start === state.start && next.end === state.end ? state : next;
    }
    case "insert":
      return replaceSelection(state, action.text);
    case "wrap": {
      const selected = state.value.slice(state.start, state.end);
      const opener = `${action.name}(`;
      return selected
        ? replaceSelection(state, `${opener}${selected})`)
        : replaceSelection(state, `${opener})`, opener.length);
    }
    case "backspace":
      return backspace(state);
    case "clear":
      return EMPTY_EDITOR;
  }
}
