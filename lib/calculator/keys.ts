/** Keypad layout and the keyboard shortcuts that map onto it. */

export type KeyAction =
  | { type: "insert"; text: string }
  | { type: "wrap"; name: string }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "evaluate" }
  | { type: "toggleSecond" };

export type KeyKind = "digit" | "operator" | "function" | "control" | "equals";

export type KeyDef = {
  id: string;
  label: string;
  /** Accessible name when the label is a symbol. */
  ariaLabel?: string;
  action: KeyAction;
  /** Alternate function used when "2nd" is active. */
  second?: { label: string; ariaLabel?: string; action: KeyAction };
  kind: KeyKind;
};

const insert = (text: string): KeyAction => ({ type: "insert", text });
const wrap = (name: string): KeyAction => ({ type: "wrap", name });
const digit = (d: string): KeyDef => ({ id: `d${d}`, label: d, action: insert(d), kind: "digit" });

/** Keys in row-major order for a 5-column grid. */
export const KEYPAD: KeyDef[] = [
  { id: "second", label: "2nd", ariaLabel: "Second function", action: { type: "toggleSecond" }, kind: "control" },
  { id: "lparen", label: "(", action: insert("("), kind: "operator" },
  { id: "rparen", label: ")", action: insert(")"), kind: "operator" },
  { id: "del", label: "DEL", ariaLabel: "Delete", action: { type: "backspace" }, kind: "control" },
  { id: "clear", label: "AC", ariaLabel: "All clear", action: { type: "clear" }, kind: "control" },

  { id: "sin", label: "sin", action: wrap("sin"), second: { label: "sin⁻¹", ariaLabel: "arcsine", action: wrap("asin") }, kind: "function" },
  { id: "cos", label: "cos", action: wrap("cos"), second: { label: "cos⁻¹", ariaLabel: "arccosine", action: wrap("acos") }, kind: "function" },
  { id: "tan", label: "tan", action: wrap("tan"), second: { label: "tan⁻¹", ariaLabel: "arctangent", action: wrap("atan") }, kind: "function" },
  { id: "ln", label: "ln", ariaLabel: "natural log", action: wrap("log"), second: { label: "eˣ", ariaLabel: "e to the power", action: wrap("exp") }, kind: "function" },
  { id: "log", label: "log", ariaLabel: "log base 10", action: wrap("log10"), second: { label: "10ˣ", ariaLabel: "10 to the power", action: insert("10^") }, kind: "function" },

  { id: "square", label: "x²", ariaLabel: "square", action: insert("^2"), second: { label: "x⁻¹", ariaLabel: "reciprocal", action: insert("^-1") }, kind: "function" },
  { id: "pow", label: "xʸ", ariaLabel: "power", action: insert("^"), second: { label: "ʸ√x", ariaLabel: "nth root", action: wrap("nthRoot") }, kind: "function" },
  { id: "sqrt", label: "√", ariaLabel: "square root", action: wrap("sqrt"), second: { label: "∛", ariaLabel: "cube root", action: wrap("cbrt") }, kind: "function" },
  { id: "fact", label: "x!", ariaLabel: "factorial", action: insert("!"), second: { label: "|x|", ariaLabel: "absolute value", action: wrap("abs") }, kind: "function" },
  { id: "pi", label: "π", ariaLabel: "pi", action: insert("pi"), second: { label: "e", ariaLabel: "Euler's number", action: insert("e") }, kind: "function" },

  digit("7"),
  digit("8"),
  digit("9"),
  { id: "div", label: "÷", ariaLabel: "divide", action: insert("/"), kind: "operator" },
  { id: "x", label: "x", ariaLabel: "variable x", action: insert("x"), kind: "function" },

  digit("4"),
  digit("5"),
  digit("6"),
  { id: "mul", label: "×", ariaLabel: "multiply", action: insert("*"), kind: "operator" },
  { id: "ans", label: "ans", ariaLabel: "previous answer", action: insert("ans"), kind: "function" },

  digit("1"),
  digit("2"),
  digit("3"),
  { id: "sub", label: "−", ariaLabel: "minus", action: insert("-"), kind: "operator" },
  { id: "exp10", label: "EE", ariaLabel: "times ten to the power", action: insert("e"), kind: "function" },

  digit("0"),
  { id: "dot", label: ".", ariaLabel: "decimal point", action: insert("."), kind: "digit" },
  { id: "comma", label: ",", ariaLabel: "comma", action: insert(","), kind: "operator" },
  { id: "add", label: "+", ariaLabel: "plus", action: insert("+"), kind: "operator" },
  { id: "eq", label: "=", ariaLabel: "equals", action: { type: "evaluate" }, kind: "equals" },
];

/** Physical keys that correspond to a keypad button, used to highlight it. */
export const KEYBOARD_TO_KEY: Record<string, string> = {
  ...Object.fromEntries("0123456789".split("").map((d) => [d, `d${d}`])),
  ".": "dot",
  ",": "comma",
  "+": "add",
  "-": "sub",
  "*": "mul",
  "/": "div",
  "^": "pow",
  "!": "fact",
  "(": "lparen",
  ")": "rparen",
  x: "x",
  Enter: "eq",
  Backspace: "del",
  Escape: "clear",
};
